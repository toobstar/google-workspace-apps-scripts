/*

 Set up access to Slack API
 
 1. Create Custom App in Slack in https://api.slack.com/apps 
 2. Create app "From scratch"
 3. Go to the left sidebar and click OAuth & Permissions
 4. Scroll down to find "Scopes" and add those required by: 
      https://api.slack.com/methods/conversations.join
      https://api.slack.com/methods/conversations.archive
      https://api.slack.com/methods/conversations.history
 5. Record the oauth token to be used in API token var below
 6. Go to the left sidebar and "Install App" and "Request to install"
 7. Get an Admin to accept the request
 8. Refresh the "Intall App" page to finalise intall process

 This is built to run in google sheets code environment:
 
 1. Create a new sheet via https://sheets.new
 2. Go to Menu > "Extensions" > "Apps Script" and paste the contents here into the editor
 3. Run in order:
      a) initChannels() 
      b) fillAgeOfLastMessage()
      c) archiveNoMembers()
      d) archiveNoRecentMessages()      
 
*/

const SLACK_API_TOKEN = 'xoxb-????????'
const sheet_channels = 'channels'
const sheet_archive_record = 'archived'
const CUTOFF_DATE = '2023-05-01'

let ss = SpreadsheetApp.getActiveSpreadsheet()

function initChannels() {
  let channelSheet = initChannelSheet()

  fetchSlackApi('conversations.list', { limit: 1000 }, function(response) {
    let activeChannels = response.channels.filter(c => !c.is_archived)
    let channelInfoOutput = activeChannels.map(c => [c.name, c.id, c.num_members, new Date(c.updated), ''])
    channelInfoOutput.unshift(['name', 'id', '# members', 'updated', 'last_message'])
    channelSheet.getRange(1,1,channelInfoOutput.length, channelInfoOutput[0].length).setValues(channelInfoOutput)
  })
}

function initChannelSheet() {
  let channelSheet = ss.getSheetByName(sheet_channels)
  if (channelSheet != null) {
    channelSheet.clear()
  } else {
    channelSheet = ss.insertSheet()
    channelSheet.setName(sheet_channels)
  }
}

function initArchiveSheet() {
  let archivedSheet = ss.getSheetByName(sheet_archive_record)
  if (!archivedSheet) {
    archivedSheet = ss.insertSheet()
    archivedSheet.setName(sheet_archive_record)
    archivedSheet.appendRow(['channel', 'id', 'date'])
  }
}

function fillAgeOfLastMessage() {
  let channelSheet = ss.getSheetByName(sheet_channels)
  let channelData = channelSheet.getDataRange().getValues()
  channelData.forEach((row, idx) => {
    if (idx > 0) { // skip header
      [name, channelId, numMembers, updatedDate, latestMessage] = row
      if (!latestMessage) {
        Utilities.sleep(3000)
        fetchSlackApi('conversations.join', {'channel': channelId}, function(r1) {
          if (r1.ok) {
            console.log('join ok', idx, name, channelId)
            let payload = {'limit': 20, 'channel': channelId}
            fetchSlackApi('conversations.history', payload, function(res) {
              
              let msgs = res.messages
              msgs = msgs.filter(m => m.type == 'message')
              msgs = msgs.filter(m => !m.subtype || m.subtype != 'bot_message')
              msgs = msgs.filter(m => !m.subtype || m.subtype != 'channel_join')
              console.log(name, 'count before/after ' , res.messages.length, msgs.length)

              if (msgs.length > 0) {
                let latestMessage = msgs[0]
                let d = latestMessage.ts.split('.')[0]
                let latestDate = new Date(d * 1000)
                console.log(name, latestDate, latestMessage.text)
                channelSheet.getRange
                let cell = channelSheet.getRange((idx+1),5)
                cell.setValue(latestDate);
              }
            })
          } else {
            console.error(r1)
          }
        })   
      } else {
        console.log('skipping: ', name, latestMessage)
      }
    }
  })
}

function archiveNoRecentMessages() {
  let archivedSheet = initArchiveSheet()

  let cutoffDate = new Date(CUTOFF_DATE)

  let channelSheet = ss.getSheetByName(sheet_channels)
  let channelData = channelSheet.getDataRange().getValues()
  channelData.forEach((row, idx) => {
    if (idx > 0) { // skip header
      [name, id, numMembers, updatedDate, latestMessageDate] = row
      
      if (latestMessageDate && latestMessageDate < cutoffDate) {
        console.log('To be archived', name, latestMessageDate)
        Utilities.sleep(2000)
        archiveChannel(name, id, archivedSheet)
      }
    }
  })

}

function archiveNoMembers() {
  let archivedSheet = initArchiveSheet()

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
          console.log('archived ', channelName)
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
  const url = `https://slack.com/api/${method}`
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': `Bearer ${SLACK_API_TOKEN}`,
  }

  const options = {
    method: 'GET',
    headers: headers,
    payload: params,
    muteHttpExceptions: true,
  }

  const response = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(response.getContentText());
  if (!json.ok) {
    throw new Error(json.error);
  }

  if (json.response_metadata && json.response_metadata.next_cursor) {
    callback(json, json.response_metadata.next_cursor)
  } else {
    callback(json, null)
  }
}
