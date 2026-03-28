//========================================================================================
// BACKEND: GOOGLE APPS SCRIPT PARA MAP APP
//========================================================================================
// INSTRUCCIONES DE INSTALACIÓN:
// 1. Ve a Extensiones > Apps Script en tu documento de Google Sheets.
// 2. Borra el código que haya y pega todo este archivo.
// 3. Haz clic en "Implementar" (Deploy) > "Nueva implementación" (New deployment).
// 4. Tipo: Aplicación web (Web app).
// 5. Ejecutar como: "Yo".
// 6. Quién tiene acceso: "Cualquier persona" (Anyone).
// 7. Copia la "URL de la aplicación web" y pégala en app.js (en SCRIPT_URL).
//========================================================================================

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const SHEET_NAME = 'DatosMapa';
const AGENDA_SHEET_NAME = 'Hoja 1';

// CONTRASEÑA DE ACCESO A LA APLICACIÓN (Cámbiala por una más segura)
const APP_PASSWORD = "1234";

// Inicializar la hoja con cabeceras si no existe
function initSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // 1. Inicialización de la hoja de Datos Mapa (Salones)
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    const headers = ['id', 'name', 'type', 'address', 'phone', 'email', 'manager', 'operators', 'techBox', 'observations'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }
  
  // 2. Inicialización de la hoja de Agenda de Contactos
  let agendaSheet = ss.getSheetByName(AGENDA_SHEET_NAME);
  if (!agendaSheet) {
    agendaSheet = ss.insertSheet(AGENDA_SHEET_NAME);
  }
  
  // Asegurar que las cabeceras de la agenda siempre son las correctas (tal como las creó el usuario)
  const agendaHeaders = ['ID', 'CATERGORÍA', 'NOMBRE', 'TELÉFONO', 'EMAIL', 'OBSERVCIONES'];
  agendaSheet.getRange(1, 1, 1, agendaHeaders.length).setValues([agendaHeaders]);
  agendaSheet.getRange(1, 1, 1, agendaHeaders.length).setFontWeight("bold");
  
  return { sheet, agendaSheet };
}

// Para obtener peticiones GET (Leer datos)
function doGet(e) {
  try {
    const pwd = e.parameter.pwd;
    if (pwd !== APP_PASSWORD) {
        return ContentService.createTextOutput(JSON.stringify({success: false, error: 'Acceso denegado: Contraseña incorrecta'}))
            .setMimeType(ContentService.MimeType.JSON);
    }
    
    const sheets = initSheet();
    
    // --- Leer datos de Salones (DatosMapa) ---
    const dataRange = sheets.sheet.getDataRange();
    const values = dataRange.getValues();
    const headers = values[0];
    const jsonData = [];
    
    // Validar si hay datos más allá de la cabecera
    if (values.length > 1) {
        for (let i = 1; i < values.length; i++) {
            let rowData = {};
            if (values[i][0] !== "") { // Skip empty rows
                for (let j = 0; j < headers.length; j++) {
                    rowData[headers[j]] = values[i][j];
                }
                jsonData.push(rowData);
            }
        }
    }
    
    // --- Leer datos de Agenda (AgendaContactos) ---
    const agendaRange = sheets.agendaSheet.getDataRange();
    const agendaValues = agendaRange.getValues();
    const agendaHeaders = ['ID', 'CATERGORÍA', 'NOMBRE', 'TELÉFONO', 'EMAIL', 'OBSERVCIONES']; // Forzar cabeceras
    const jsonAgendaData = [];
    
    // Validar si hay datos más allá de la cabecera
    if (agendaValues.length > 1) {
        for (let i = 1; i < agendaValues.length; i++) {
            let rowData = {};
            if (agendaValues[i][0] !== "") {
                // Mapear a claves internas para la app
                rowData['id'] = agendaValues[i][0] !== undefined ? agendaValues[i][0] : "";
                rowData['category'] = agendaValues[i][1] !== undefined ? agendaValues[i][1] : "";
                rowData['name'] = agendaValues[i][2] !== undefined ? agendaValues[i][2] : "";
                rowData['phone'] = agendaValues[i][3] !== undefined ? agendaValues[i][3] : "";
                rowData['email'] = agendaValues[i][4] !== undefined ? agendaValues[i][4] : "";
                rowData['observaciones'] = agendaValues[i][5] !== undefined ? agendaValues[i][5] : "";
                jsonAgendaData.push(rowData);
            }
        }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
        success: true, 
        data: jsonData,
        contacts: jsonAgendaData
    })).setMimeType(ContentService.MimeType.JSON);
        
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: err.toString()}))
        .setMimeType(ContentService.MimeType.JSON);
  }
}

// Para obtener peticiones POST (Actualizar datos)
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    
    if (payload.pwd !== APP_PASSWORD) {
        return ContentService.createTextOutput(JSON.stringify({success: false, error: 'Acceso denegado: Contraseña incorrecta'}))
            .setMimeType(ContentService.MimeType.JSON);
    }
    
    const sheets = initSheet();
    
    if (payload.action === 'update') {
        const idToUpdate = payload.id;
        const sheet = sheets.sheet;
        const dataRange = sheet.getDataRange();
        const values = dataRange.getValues();
        let rowIndex = -1;
        
        for (let i = 1; i < values.length; i++) {
            if (values[i][0].toString() === idToUpdate.toString()) {
                rowIndex = i + 1;
                break;
            }
        }
        
        if (rowIndex !== -1) {
            // ['id', 'name', 'type', 'address', 'phone', 'email', 'manager', 'operators', 'techBox', 'observations']
            sheet.getRange(rowIndex, 5).setValue(payload.phone || "");
            sheet.getRange(rowIndex, 6).setValue(payload.email || "");
            sheet.getRange(rowIndex, 7).setValue(payload.manager || "");
            sheet.getRange(rowIndex, 8).setValue(payload.operators || "");
            sheet.getRange(rowIndex, 9).setValue(payload.techBox || "");
            sheet.getRange(rowIndex, 10).setValue(payload.observations || "");
            
            return ContentService.createTextOutput(JSON.stringify({success: true, message: "Actualizado correctamente"}))
                .setMimeType(ContentService.MimeType.JSON);
        } else {
            return ContentService.createTextOutput(JSON.stringify({success: false, error: "ID no encontrado"}))
                .setMimeType(ContentService.MimeType.JSON);
        }
    }
    else if (payload.action === 'addContact') {
        const sheet = sheets.agendaSheet;
        const newId = 'c' + new Date().getTime();
        
        // ['ID', 'CATERGORÍA', 'NOMBRE', 'TELÉFONO', 'EMAIL', 'OBSERVCIONES']
        sheet.appendRow([
            newId,
            payload.category || "",
            payload.name || "",
            payload.phone || "",
            payload.email || "",
            payload.observaciones || ""
        ]);
        
        return ContentService.createTextOutput(JSON.stringify({success: true, message: "Contacto añadido correctamente"}))
            .setMimeType(ContentService.MimeType.JSON);
    }
    else if (payload.action === 'updateContact') {
        const idToUpdate = payload.id;
        const sheet = sheets.agendaSheet;
        
        const dataRange = sheet.getDataRange();
        const values = dataRange.getValues();
        let rowIndex = -1;
        
        for (let i = 1; i < values.length; i++) {
            if (values[i][0].toString() === idToUpdate.toString()) {
                rowIndex = i + 1;
                break;
            }
        }
        
        if (rowIndex !== -1) {
            // ['ID', 'CATERGORÍA', 'NOMBRE', 'TELÉFONO', 'EMAIL', 'OBSERVCIONES']
            sheet.getRange(rowIndex, 2).setValue(payload.category || "");
            sheet.getRange(rowIndex, 3).setValue(payload.name || "");
            sheet.getRange(rowIndex, 4).setValue(payload.phone || "");
            sheet.getRange(rowIndex, 5).setValue(payload.email || "");
            sheet.getRange(rowIndex, 6).setValue(payload.observaciones || "");
            
            return ContentService.createTextOutput(JSON.stringify({success: true, message: "Contacto actualizado correctamente"}))
                .setMimeType(ContentService.MimeType.JSON);
        } else {
            return ContentService.createTextOutput(JSON.stringify({success: false, error: "ID de contacto no encontrado"}))
                .setMimeType(ContentService.MimeType.JSON);
        }
    }
    else if (payload.action === 'deleteContact') {
        const idToDelete = payload.id;
        const sheet = sheets.agendaSheet;
        
        const dataRange = sheet.getDataRange();
        const values = dataRange.getValues();
        let rowIndex = -1;
        
        for (let i = 1; i < values.length; i++) {
            if (values[i][0].toString() === idToDelete.toString()) {
                rowIndex = i + 1;
                break;
            }
        }
        
        if (rowIndex !== -1) {
            sheet.deleteRow(rowIndex);
            return ContentService.createTextOutput(JSON.stringify({success: true, message: "Contacto eliminado correctamente"}))
                .setMimeType(ContentService.MimeType.JSON);
        } else {
            return ContentService.createTextOutput(JSON.stringify({success: false, error: "ID de contacto no encontrado"}))
                .setMimeType(ContentService.MimeType.JSON);
        }
    }
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: err.toString()}))
        .setMimeType(ContentService.MimeType.JSON);
  }
}

// Importante para evitar problemas de CORS CORS (Cross-Origin Resource Sharing)
function doOptions(e) {
  var headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept"
  };
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders(headers);
}
