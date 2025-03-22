/**
  A common use case is for emails coming into a user or group email to have attachments that are useful to also make available in a Google Drive location
  This script will search an inbox for attachments and copy those into the target folder.

  1) set folder ID
  2) set email of account that receives emails (the account running this must be a member of that group)
  3) confirm search query works in browser
  4) run manually to test
  5) setup a trigger to be run on a regular schedule

*/


// Copy from URL of shared drive in browser
const FOLDER_ID = "???" 

// Replace with the search query to find emails with attachments.  Can test this manually in browser at gmail.com
const SEARCH_QUERY = "to:name_of_account@company.com from:me has:attachment" 

function findAndSaveNewAttachmentsToDrive() {
  let driveFolder = DriveApp.getFolderById(FOLDER_ID)
  
  let searchQuery = SEARCH_QUERY
  let lastExecutionTime = getLastExecutionDate()
  searchQuery += " after:" + lastExecutionTime
  console.log(searchQuery)

  let threads = GmailApp.search(searchQuery)  
  threads.forEach(messages => {

    message.getAttachments.forEach(attachment => {
      let attachmentBlob = attachment.copyBlob()
      let subject = message.getSubject()
      if (subject.startsWith('Fwd: ')) {
        subject = subject.substring(5)
      }
      let fileName =  subject + ' -- ' + attachment.getName()

      let existingAlready = driveFolder.getFilesByName(fileName).hasNext()
      if (!existingAlready) {
        driveFolder.createFile(attachmentBlob).setName(fileName)
      }
    })
  
  })

  }
  updateLastExecutionDate()
}

function getLastExecutionDate() {
  let properties = PropertiesService.getUserProperties()
  return properties.getProperty("lastExecutionDate") || "2025-01-01"
}

function resetLastExecutionDate() {
  PropertiesService.getUserProperties().deleteProperty("lastExecutionDate")
}

function updateLastExecutionDate() {
  let now = new Date()
  let dateString = now.toISOString().split("T")[0]
  console.log('updateLastExecutionDate ' + dateString)
  let properties = PropertiesService.getUserProperties()
  properties.setProperty("lastExecutionDate", dateString)
}
