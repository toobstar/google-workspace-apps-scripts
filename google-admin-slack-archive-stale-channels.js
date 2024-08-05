/*

 Set up access to Slack API
 
 1. Create Custom App in Slack in https://api.slack.com/apps 
 2. Create app "From scratch"
 3. Go to the left sidebar and click OAuth & Permissions
 4. Scroll down to find "Scopes" and add those required by: 
      https://api.slack.com/methods/conversations.join
      https://api.slack.com/methods/conversations.archive
 5. Record the oauth token to be used in API token var below
 6. Go to the left sidebar and "Install App" and "Request to install"
 7. Get an Admin to accept the request
 8. Refresh the "Intall App" page to finalise intall process

 This is built to run in google sheets code environment:
 
 1. Create a new sheet via https://sheets.new
 2. Go to Menu > "Extensions" > "Apps Script" and paste the contents here into the editor
 3. Run initChannels() then archiveNoMembers() when ready
 
*/

const SLACK_API_TOKEN = 'xoxb-????????'
const sheet_channels = 'channels'
const sheet_archive_record = 'archived'

let ss = SpreadsheetApp.getActiveSpreadsheet()

function initChannels() {
  let channelSheet = ss.getSheetByName(sheet_channels)
  if (channelSheet != null) {
    channelSheet.clear()
  } else {
    channelSheet = ss.insertSheet()
    channelSheet.setName(sheet_channels)
  }

  fetchSlackApi('conversations.list', { limit: 1000 }, function(response) {
    let activeChannels = response.channels.filter(c => !c.is_archived)
    let channelInfo = activeChannels.map(c => [c.name, c.id, c.num_members, new Date(c.updated)])
    channelInfo.unshift(['name', 'id', '# members', 'updated'])
    channelSheet.getRange(1, 1, channelInfo.length, channelInfo[0].length).setValues(channelInfo)
  })
}

function archiveNoMembers() {

  let archivedSheet = ss.getSheetByName(sheet_archive_record)
  if (!archivedSheet) {
    archivedSheet = ss.insertSheet()
    archivedSheet.setName(sheet_archive_record)
    archivedSheet.appendRow(['channel', 'id', 'date'])
  }

  let channelSheet = ss.getSheetByName(sheet_channels)
  let channelData = channelSheet.getDataRange().getValues()
  channelData.forEach((row, idx) => {
    if (idx > 0) { // skip header
      [name, id, numMembers, updatedDate] = row
      if (numMembers < 1) {
        console.log('To be archived', idx, name, id, numMembers, updatedDate)
        archiveChannel(name, id, archivedSheet)
      }
    }
  })

}

function archiveChannel(channelName, channelId, archivedSheet) {
  fetchSlackApi('conversations.join', {'channel': channelId}, function(r1) {
    if (r1.ok) {
      console.log('join ok')
      fetchSlackApi('conversations.archive', {'channel': channelId}, function(r2) {
        if (r2.ok) {
          archivedSheet.appendRow([channelName, channelId, new Date()])
        } else {
          console.error(r2)    
        }
      })
    } else {
      console.error(r1)
    }
  })
  
}

function fetchSlackApi(method, params, callback) {
  const url = `https://slack.com/api/${method}`;
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': `Bearer ${SLACK_API_TOKEN}`,
  };

  const options = {
    method: 'GET',
    headers: headers,
    payload: params,
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(response.getContentText());
  if (!json.ok) {
    throw new Error(json.error);
  }

  if (json.response_metadata && json.response_metadata.next_cursor) {
    callback(json, json.response_metadata.next_cursor);
  } else {
    callback(json, null);
  }
}









