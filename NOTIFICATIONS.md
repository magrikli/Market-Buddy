# Docker Hub Push Notifications

This document explains how to set up notifications for Docker Hub pushes in the GitHub Actions workflow.

## Overview

The `docker-build-push.yml` workflow automatically sends notifications when Docker images are built and pushed to Docker Hub. The workflow supports multiple notification methods:

1. **GitHub Actions Summary** (Built-in, always enabled)
2. **Slack Notifications** (Optional, requires configuration)
3. **Discord Notifications** (Optional, requires configuration)
4. **Email Notifications** (Optional, via GitHub settings)

## Built-in Notifications

### GitHub Actions Summary

Every workflow run automatically creates a summary visible in the GitHub Actions tab. No configuration needed.

- ✅ **Success**: Shows image name, digest, commit, author, and timestamp
- ❌ **Failure**: Shows error details and links to logs

### GitHub Email Notifications

GitHub can send email notifications for workflow runs:

1. Go to **Settings** → **Notifications**
2. Under **Actions**, enable:
   - "Failed workflow runs"
   - "Successful workflow runs" (optional)

## Optional Notifications

### Slack Integration

To receive notifications in Slack:

#### Step 1: Create a Slack Webhook

1. Go to your Slack workspace
2. Navigate to **Apps** → **Incoming Webhooks**
3. Click **Add to Slack**
4. Choose a channel for notifications
5. Copy the webhook URL (looks like: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX`)

#### Step 2: Add Webhook to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `SLACK_WEBHOOK_URL`
5. Value: Paste your Slack webhook URL
6. Click **Add secret**

#### Step 3: Test

Push a commit to the `main` branch. The workflow will run and send a notification to your Slack channel.

#### Slack Notification Features

- ✅ **Success notifications** with:
  - Repository name
  - Docker image name and tag
  - Commit SHA
  - Author name
  - Link to view the workflow run
  
- ❌ **Failure notifications** with:
  - Repository name
  - Commit SHA
  - Author name
  - Link to view the workflow logs

### Discord Integration

To receive notifications in Discord:

#### Step 1: Create a Discord Webhook

1. Open Discord and go to your server
2. Right-click the channel where you want notifications
3. Select **Edit Channel** → **Integrations**
4. Click **Create Webhook** or **View Webhooks**
5. Click **New Webhook**
6. Name the webhook (e.g., "Docker Build Bot")
7. Copy the webhook URL (looks like: `https://discord.com/api/webhooks/123456789/abcdefghijklmnop`)

#### Step 2: Add Webhook to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `DISCORD_WEBHOOK_URL`
5. Value: Paste your Discord webhook URL
6. Click **Add secret**

#### Step 3: Test

Push a commit to the `main` branch. The workflow will run and send a notification to your Discord channel.

#### Discord Notification Features

- ✅ **Success notifications** with:
  - Repository name
  - Docker image name and tag
  - Commit SHA
  - Author name
  - Link to view the workflow run
  - Green color indicator (success)
  
- ❌ **Failure notifications** with:
  - Repository name
  - Commit SHA
  - Author name
  - Link to view the workflow logs
  - Red color indicator (failure)

## Notification Behavior

### When Notifications Are Sent

- **On Success**: Notifications are sent when the Docker image is successfully built and pushed to Docker Hub
- **On Failure**: Notifications are sent when any step in the build/push process fails

### Conditional Notifications

- Slack and Discord notifications are **only sent if** the respective webhook URL is configured in GitHub Secrets
- If no webhook is configured, the workflow runs normally without external notifications
- GitHub Actions Summary is always generated regardless of webhook configuration

## Troubleshooting

### Slack Notifications Not Working

1. **Verify the webhook URL**:
   - Ensure `SLACK_WEBHOOK_URL` secret is correctly set
   - Test the webhook URL directly using curl:
     ```bash
     curl -X POST -H 'Content-type: application/json' \
       --data '{"text":"Test notification"}' \
       YOUR_WEBHOOK_URL
     ```

2. **Check workflow logs**:
   - Go to Actions tab → Select the workflow run
   - Check the "Notify Slack" step for errors

3. **Webhook expired**: Slack webhooks can be revoked. Create a new one if needed.

### Discord Notifications Not Working

1. **Verify the webhook URL**:
   - Ensure `DISCORD_WEBHOOK_URL` secret is correctly set
   - Test the webhook URL directly using curl:
     ```bash
     curl -X POST -H 'Content-Type: application/json' \
       -d '{"content":"Test notification"}' \
       YOUR_WEBHOOK_URL
     ```

2. **Check workflow logs**:
   - Go to Actions tab → Select the workflow run
   - Check the "Notify Discord" step for errors

3. **Webhook deleted**: If the webhook was deleted in Discord, create a new one.

### General Troubleshooting

1. **Secrets not available**:
   - Ensure secrets are added at the repository level (not organization level)
   - Secret names are case-sensitive

2. **Workflow not triggering**:
   - Ensure you're pushing to the `main` branch
   - Check that the workflow file is in `.github/workflows/` directory

3. **View detailed logs**:
   - Go to Actions tab
   - Click on the workflow run
   - Expand each step to see detailed output

## Customization

### Modify Notification Content

You can customize the notification messages by editing `.github/workflows/docker-build-push.yml`:

- **Slack notifications**: Modify the `payload` in the "Notify Slack" steps
- **Discord notifications**: Modify the JSON payload in the curl command
- **GitHub Summary**: Modify the echo commands in the summary steps

### Add Additional Notification Methods

You can add more notification integrations by adding new steps to the workflow:

- **Microsoft Teams**: Use the Teams webhook connector
- **Telegram**: Use the Telegram Bot API
- **Email**: Use a third-party email service with API
- **Custom webhooks**: Add curl commands to POST to your own endpoints

## Example Notification

### Slack Success Notification

```
✅ Docker Image Published

Repository: magrikli/Market-Buddy
Image: `your-dockerhub-username/finflow:latest`
Commit: `abc123def456`
Author: magrikli

[View Workflow]
```

### Discord Success Notification

```
✅ Docker Image Published

The Docker image has been successfully built and pushed to Docker Hub.

Repository: magrikli/Market-Buddy
Image: `your-dockerhub-username/finflow:latest`
Commit: `abc123def456`
Author: magrikli
Workflow: [View Run](link)
```

## Security Notes

- **Never commit webhook URLs directly** to the repository
- Always use GitHub Secrets to store sensitive information
- Webhook URLs should be treated as credentials
- Regularly rotate webhooks if they may have been exposed
- Review who has access to your GitHub repository secrets

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)
- [Discord Webhooks Guide](https://discord.com/developers/docs/resources/webhook)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
