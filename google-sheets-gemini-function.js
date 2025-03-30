/**
    As compelling at Google's Gemini features are, and the fact they are sprinkled across the Google Product suite
    (including Sheets) it seems like a massive oversight to not include a direct function call from a cell to Gemini.
    This script allows you to correct that with a hook into your own API instance.

    By doing this you can leverage Gemini AI insights in a spreadsheet, with all the benefits of auto-fill and 
    updates as data changes. 

    Background: 
        To publish as function https://sheetbest.com/blog/deploying-google-sheets-custom-functions/

        Url-fetch https://developers.google.com/apps-script/reference/url-fetch    
*/

// Setup an API key: https://aistudio.google.com/app/apikey
const apiKey = "???"

// https://discuss.ai.google.dev/t/gemini-pro-open-source-model-suddenly-its-throwing-on-404-error/69200
// const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"  
const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-002:generateContent"  

const cHITS = 'HITS'
const cMISSES = 'MISSES'

function onInstall(e) { 
  console.log('onInstall')
  onOpen(e) 
}

// add menu to google sheets when started
function onOpen() {
  console.log('onOpen')
  let menu = SpreadsheetApp.getUi().createMenu("Prompt Gemini AI")
  menu.addItem("Enable and info", "turnOn")
  menu.addItem("Cache Stats", "showCacheInfo")
  menu.addToUi()
}

function turnOn() {
  SpreadsheetApp.getUi().alert('You can access the Gemini AI prompt using the function PROMPT_GEMINI(prompt, data)')
}

// for the curious
function showCacheInfo() {
  let cache = CacheService.getScriptCache()
  let cacheHits = cache.get(cHITS)
  let cacheMisses = cache.get(cMISSES)
  SpreadsheetApp.getUi().alert('Cache Hits ' + (cacheHits ? cacheHits : 0) + ' //  Misses (calls to API) ' + (cacheMisses ? cacheMisses : 0) )
}

function PROMPT_GEMINI(objective, dataRange) {
  let cache = CacheService.getScriptCache()
  let cacheKey = JSON.stringify([objective, dataRange])
  console.log("cacheKey", cacheKey)
  let cachedResult = cache.get(cacheKey)
  let cacheHits = cache.get(cHITS)
  let cacheMisses = cache.get(cMISSES)
  if (cachedResult) {
    let res = JSON.parse(cachedResult)
    cacheHits++
    cache.put(cHITS, cacheHits)
    console.log("cache hit", cacheHits, cachedResult, res)
    return res
  } else {
    cacheMisses++
    cache.put(cMISSES, cacheMisses)
    console.log("cache miss", cacheMisses)
  }

  if (!objective || !dataRange) {
    console.log("Invalid input: Objective or dataRange is missing.")
    return [["Invalid input. Please provide both an objective and a data range."]]
  }

  if (!Array.isArray(dataRange)) {
    dataRange = [[dataRange]] // Converting single cell input to a 2D array
  }

  let results = []

  console.log("Starting to process the data range.")
  if (dataRange[0].length === 1) {     // Process each cell in a single-column range individually
    for (let i = 0; i < dataRange.length; i++) {
      let cellData = dataRange[i][0].toString()
      let cellPrompt = createPrompt(objective, cellData)
      let apiResult = fetchAPIResponse(cellPrompt, url, apiKey)
      results.push([apiResult])  // Store each response in its own row
    }
  } else {
    let combinedData = combineData(dataRange)
    let combinedPrompt = createPrompt(objective, combinedData)
    let apiResult = fetchAPIResponse(combinedPrompt, url, apiKey)
    results.push([apiResult]) 
  }

  let textToBeCached = JSON.stringify(results)
  console.log("Finished", textToBeCached)
  cache.put(cacheKey, JSON.stringify(textToBeCached))
  return results
}

// Combine all data into a single string or a structured format that the API can understand
function combineData(dataRange) {
  return dataRange.map(row => row.join(", ")).join("; ")
}

function createPrompt(objective, rowData) {
  return `Objective: ${objective}\nData: ${rowData}\n`.trim()
}

function fetchAPIResponse(prompt, url, apiKey) {
  let fullUrl = `${url}?key=${apiKey}`
  console.log(`Requesting URL: ${fullUrl}`)
  let requestBody = { contents: [{ parts: [{ text: prompt }] }] }
  let options = { method: 'post', contentType: 'application/json', payload: JSON.stringify(requestBody), muteHttpExceptions: true }

  let response = UrlFetchApp.fetch(fullUrl, options)
  let responseCode = response.getResponseCode()
  let responseContent = response.getContentText()

  console.log(`Response Text: ${responseContent}`)
  console.log(`Response Code: ${responseCode}`)
  if (responseCode === 200) {
    let jsonResponse = JSON.parse(responseContent)
    return jsonResponse && jsonResponse.candidates && jsonResponse.candidates.length > 0 ?
           jsonResponse.candidates[0].content.parts.map(part => part.text).join(' ') :
           "No valid content generated"
  } else {
    console.error(`API call failed with status code: ${responseCode}`)
    return "API call failed"
  }
}
