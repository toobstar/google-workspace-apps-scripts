# Google Workspace App Scripts

A collection of [Google Workspace apps scripts](https://www.google.com/script/start/) that I use a lot or have found useful.  As an administrator for Google Workspace the admin portal is annoyingly limited.  There is more control with enterprise license versions, but even then it's often useful to use other tools to assist in automation or bulk updates. 

A popular (SysAdmin) approach is it use the [GAM CLI tool](https://github.com/GAM-team/GAM) but I find (as a former software engineer) that code within the Google Apps Script environment is preferable.

### Google Workspace: Clear Active Sessions
Remove authenticated session tokens for users who have signed in with google

[a relative link](google-admin-clear-active-sessions)


### Slack: Archive channels with low activity
Connect to Slack, join public channels, determine level of activity, and based on threshold archive channel

### Google Sheets: Utils
Commonly used code to read in, process, and write to google sheets 

A common use case is for emails coming into a user or group email to have attachments that are useful to also make available in a Google Drive location
  This script will search an inbox for attachments and copy those into the target folder.

  
