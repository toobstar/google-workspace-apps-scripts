
function process() {
  let activeSheet = SpreadsheetApp.getActiveSpreadsheet()

  let outputData = []
  outputData.push(['column1', 'column2', 'column3']) // headers
  
  let inputSheet = activeSS.getSheetByName('input_sheet')  
  let inputData = inputSheet.getDataRange().getValues()
  inputData.forEach((row, idx) => {
    if (idx > 0) { // skip header
      [colValue1, colValue2, colValue3] = row
      outputData.push([colValue1, colValue2, colValue3])
    }
  })

  let outputSheet = activeSS.getSheetByName('output_sheet')
  outputSheet.clear()
  outputSheet.getRange(1,1,outputData.length, outputData[0].length).setValues(outputData);
}
