#!/bin/bash
# Helper script to display SSH key for copying to GitHub Secrets
# This ensures no formatting issues

echo "=========================================="
echo "SSH KEY FOR GITHUB ACTIONS"
echo "=========================================="
echo ""
echo "Copy EVERYTHING below this line (including BEGIN and END lines):"
echo ""
echo "vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv"
cat ~/.ssh/dad-crm-new-key
echo "^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^"
echo ""
echo "Instructions:"
echo "1. Select all text between the arrows (from BEGIN to END)"
echo "2. Copy it (Cmd+C)"
echo "3. Go to: https://github.com/dilshadbvoc-ui/Dad-backend/settings/secrets/actions"
echo "4. Click 'Update' on EC2_SSH_KEY"
echo "5. Paste (Cmd+V) - make sure no extra lines before/after"
echo "6. Click 'Update secret'"
echo ""
echo "Alternative: Use GitHub CLI (more reliable):"
echo "  gh secret set EC2_SSH_KEY < ~/.ssh/dad-crm-new-key --repo dilshadbvoc-ui/Dad-backend"
echo ""
