import inquirer from 'inquirer';

/**
 * Reply Approval Workflow
 * Handles user interaction for approving/editing/skipping email replies
 */
export class ReplyApprovalWorkflow {
    constructor(config = {}) {
        this.config = {
            requireApproval: config.requireApproval !== false, // Default true
            maxRepliesPerRun: config.maxRepliesPerRun || 50,
            ...config
        };
    }

    /**
     * Prompt user to approve replies for replyable emails
     * @param {Array} replyableEmails - Array of emails with generated replies
     * @returns {Array} Approved replies ready to send
     */
    async promptForApproval(replyableEmails) {
        if (!this.config.requireApproval) {
            console.log('⚡ Auto-approval enabled, skipping user prompts');
            return replyableEmails.map(item => ({
                email: item.email,
                replyContent: item.suggestedReply
            }));
        }

        if (replyableEmails.length === 0) {
            console.log('📭 No replyable emails found');
            return [];
        }

        console.log(`\n📧 Found ${replyableEmails.length} emails that may need replies\n`);

        const approved = [];
        let skipAll = false;
        let approveAll = false;

        for (let i = 0; i < replyableEmails.length; i++) {
            const item = replyableEmails[i];
            
            // Skip if user chose "Skip All"
            if (skipAll) {
                console.log(`⏭️  Skipping remaining emails (${replyableEmails.length - i} left)`);
                break;
            }

            // Auto-approve if user chose "Approve All"
            if (approveAll) {
                approved.push({
                    email: item.email,
                    replyContent: item.suggestedReply
                });
                continue;
            }

            // Show email details
            this._displayEmailSummary(item, i + 1, replyableEmails.length);

            // Get user decision
            const decision = await this._promptForSingleEmail(item);

            if (decision.action === 'approve') {
                approved.push({
                    email: item.email,
                    replyContent: decision.replyContent
                });
                console.log('✅ Reply approved\n');
            } else if (decision.action === 'skip') {
                console.log('⏭️  Skipped\n');
            } else if (decision.action === 'approve_all') {
                approved.push({
                    email: item.email,
                    replyContent: item.suggestedReply
                });
                approveAll = true;
                console.log('✅ Approving this and all remaining emails\n');
            } else if (decision.action === 'skip_all') {
                skipAll = true;
                console.log('⏭️  Skipping this and all remaining emails\n');
            } else if (decision.action === 'quit') {
                console.log('🛑 Approval process cancelled\n');
                break;
            }
        }

        console.log(`\n📊 Approval Summary: ${approved.length} replies approved out of ${replyableEmails.length} emails\n`);
        return approved;
    }

    /**
     * Display email summary for user review
     * @private
     */
    _displayEmailSummary(item, current, total) {
        const { email, suggestedReply, replyReason, replyConfidence } = item;
        
        console.log('═'.repeat(80));
        console.log(`📧 Email ${current}/${total}`);
        console.log('═'.repeat(80));
        console.log(`From: ${email.from}`);
        console.log(`Subject: ${email.subject}`);
        console.log(`Date: ${email.date}`);
        
        if (replyConfidence) {
            console.log(`Confidence: ${(replyConfidence * 100).toFixed(0)}%`);
        }
        
        if (replyReason) {
            console.log(`Reason: ${replyReason}`);
        }
        
        console.log('\n--- Original Message (preview) ---');
        const preview = email.body.substring(0, 200);
        console.log(preview + (email.body.length > 200 ? '...' : ''));
        
        console.log('\n--- Suggested Reply ---');
        console.log(suggestedReply);
        console.log('─'.repeat(80));
    }

    /**
     * Prompt user for decision on a single email
     * @private
     */
    async _promptForSingleEmail(item) {
        const choices = [
            { name: '✅ Approve - Send this reply', value: 'approve' },
            { name: '✏️  Edit - Modify the reply before sending', value: 'edit' },
            { name: '⏭️  Skip - Don\'t send a reply to this email', value: 'skip' },
            { name: '✅✅ Approve All - Approve this and all remaining', value: 'approve_all' },
            { name: '⏭️⏭️  Skip All - Skip this and all remaining', value: 'skip_all' },
            { name: '🛑 Quit - Cancel the approval process', value: 'quit' }
        ];

        const answer = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'What would you like to do?',
                choices: choices,
                default: 'approve'
            }
        ]);

        if (answer.action === 'edit') {
            const editAnswer = await inquirer.prompt([
                {
                    type: 'editor',
                    name: 'editedReply',
                    message: 'Edit the reply (save and close editor when done):',
                    default: item.suggestedReply
                }
            ]);

            return {
                action: 'approve',
                replyContent: editAnswer.editedReply
            };
        }

        return {
            action: answer.action,
            replyContent: item.suggestedReply
        };
    }

    /**
     * Quick approval for batch processing (no interactive prompts)
     * @param {Array} replyableEmails - Array of emails with generated replies
     * @param {number} confidenceThreshold - Minimum confidence to auto-approve
     * @returns {Array} Auto-approved replies
     */
    autoApprove(replyableEmails, confidenceThreshold = 0.8) {
        console.log(`🤖 Auto-approving emails with confidence >= ${(confidenceThreshold * 100).toFixed(0)}%`);
        
        const approved = replyableEmails
            .filter(item => (item.replyConfidence || 0) >= confidenceThreshold)
            .map(item => ({
                email: item.email,
                replyContent: item.suggestedReply
            }));

        console.log(`✅ Auto-approved ${approved.length} out of ${replyableEmails.length} emails`);
        return approved;
    }

    /**
     * Dry run mode - show what would be sent without actually approving
     * @param {Array} replyableEmails - Array of emails with generated replies
     */
    dryRun(replyableEmails) {
        console.log('\n🧪 DRY RUN MODE - No emails will be sent\n');
        console.log(`Found ${replyableEmails.length} replyable emails:\n`);

        replyableEmails.forEach((item, index) => {
            console.log(`${index + 1}. To: ${item.email.from}`);
            console.log(`   Subject: Re: ${item.email.subject}`);
            console.log(`   Confidence: ${((item.replyConfidence || 0) * 100).toFixed(0)}%`);
            console.log(`   Reply preview: ${item.suggestedReply.substring(0, 100)}...`);
            console.log('');
        });

        console.log('💡 Run without --dry-run flag to actually send these replies\n');
        return [];
    }
}