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

const SPREADSHEET_ID = '1kXgyIhdU9feHpOec9sHHQTLjtX33r69-uTY5_uxKDFM';
const SHEET_NAME = 'salas';
const AGENDA_SHEET_NAME = 'contactos';

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

// =========================================================
// FUNCIÓN TEMPORAL PARA CARGAR LOS 54 SALONES AUTOMÁTICAMENTE
// =========================================================
function loadInitialData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  sheet.clear(); // Limpiamos para evitar duplicados
  
  const rawData = [
    ['id', 'name', 'type', 'address', 'phone', 'email', 'manager', 'operators', 'techBox', 'observations'],
    ['1', 'SUN CITY', 'Salón', '', '', '', '', '', '5700', ''],
    ['2', 'CRYSTAL PARK', 'Salón', '', '617935166 (Ext. 2803)', '', '', '', '7250', ''],
    ['3', 'CESARS PALACE', 'Salón', '', '677086484 (Ext. 2601)', '', '', '', '6150', ''],
    ['4', 'OCEAN', 'Salón', '', '677096981 (Ext. 2618)', '', '', '', '1550', ''],
    ['5', 'PARAISO', 'Salón', '', '677090944 (Ext. 2606)', '', '', '', '6650', ''],
    ['6', 'PREMIUM', 'Salón', '', '677094409 (Ext. 2611)', '', '', '', '6800', ''],
    ['7', 'PLAZA', 'Salón', '', '677096644 (Ext. 2617)', '', '', '', '7160', ''],
    ['8', 'ROYAL CASINO', 'Salón', '', '677095346 (Ext. 2613)', '', '', '', '6880', ''],
    ['9', 'NEW YORK', 'Salón', '', '677099398 (Ext. 2627)', '', '', '', '6100', ''],
    ['10', 'CARIBE', 'Salón', '', '677096450 (Ext. 2616)', '', '', '', '7120', ''],
    ['11', 'CALIFORNIA', 'Salón', '', '677092619 (Ext. 2608)', '', '', '', '1710', ''],
    ['12', 'FLORIDA PARK', 'Salón', '', '677099079 (Ext. 2625)', '', '', '', '7210', ''],
    ['13', 'MANHATTAN', 'Salón', '', '677093017 (Ext. 2609)', '', '', '', '6200', ''],
    ['14', 'AMERICA', 'Salón', '', '677092327 (Ext. 2607)', '', '', '', '1690', ''],
    ['15', 'ATLANTIC', 'Salón', '', '677095799 (Ext. 2614)', '', '', '', '6940', ''],
    ['16', 'FORTUNA', 'Salón', '', '677093498 (Ext. 2610)', '', '', '', '6690', ''],
    ['17', 'BELLAGIO', 'Salón', '', '677094508 (Ext. 2612)', '', '', '', '6860', ''],
    ['18', 'CANADA', 'Salón', '', '677099289 (Ext. 2626)', '', '', '', '7060', ''],
    ['19', 'BAHAMAS', 'Salón', '', '677096447 (Ext. 2615)', '', '', '', '6950', ''],
    ['20', 'TEIDE', 'Salón', '', '677206421 (Ext. 2643)', '', '', '', '6870', ''],
    ['21', 'BLACK JACK', 'Salón', '', '', '', '', '', '7080', ''],
    ['22', 'NEVADA', 'Salón', '', '677097991 (Ext. 2621)', '', '', '', '1370', ''],
    ['23', 'NEW RALLY', 'Salón', '', '617934895 (Ext. 2801)', '', '', '', '7340', ''],
    ['24', 'HABANA', 'Salón', '', '677202821 (Ext. 2634)', '', '', '', '7270', ''],
    ['25', 'CARACAS', 'Salón', '', '670019046 (Ext. 2904)', '', '', '', '7380', ''],
    ['26', 'CENTRAL PARK', 'Salón', '', '677201136 (Ext. 2629)', '', '', '', '6090', ''],
    ['27', 'LAS VEGAS', 'Salón', '', '677098091 (Ext. 2623)', '', '', '', '1606', ''],
    ['28', 'ALASKA', 'Salón', '', '677098000 (Ext. 2622)', '', '', '', '1460', ''],
    ['29', 'TROPICAL', 'Salón', '', '677202730 (Ext. 2633)', '', '', '', '6960', ''],
    ['30', 'CENTRAL AC', 'Salón', '', '', '', '', '', '', ''],
    ['31', 'LA VILLA', 'Salón', '', '677201647 (Ext. 2630)', '', '', '', '', ''],
    ['32', 'NEW CENTER', 'Salón', '', '677097004 (Ext. 2619)', '', '', '', '7090', ''],
    ['33', 'BRAZIL', 'Salón', '', '677087138 (Ext. 2603)', '', '', '', '6840', ''],
    ['34', 'POKER', 'Salón', '', '', '', '', '', '6290', ''],
    ['35', 'AVENIDA', 'Salón', '', '677204117 (Ext. 2640)', '', '', '', '6710', ''],
    ['36', 'ZAFIRO', 'Salón', '', '670019007 (Ext. 2902)', '', '', '', '7320', ''],
    ['37', 'SAHARA', 'Salón', '', '677090756 (Ext. 2605)', '', '', '', '7020', ''],
    ['38', 'NIAGARA', 'Salón', '', '617935369 (Ext. 2804)', '', '', '', '6990', ''],
    ['39', 'VENECIA', 'Salón', '', '677203604 (Ext. 2637)', '', '', '', '7140', ''],
    ['40', 'LAGUNA PARK', 'Salón', '', '677202855 (Ext. 2635)', '', '', '', '6590', ''],
    ['41', 'LOS ANGELES', 'Salón', '', '677097262 (Ext. 2620)', '', '', '', '0620', ''],
    ['42', 'LUCKY', 'Salón', '', '670063531 (Ext. 2807)', '', '', '', '7330', ''],
    ['43', 'OASIS', 'Salón', '', '677202028 (Ext. 2632)', '', '', '', '6750', ''],
    ['44', 'PARIS', 'Salón', '', '677201750 (Ext. 2631)', '', '', '', '0380', ''],
    ['45', 'GALAXY', 'Salón', '', '677206254 (Ext. 2642)', '', '', '', '6780', ''],
    ['46', 'MONTECARLO', 'Salón', '', '677087174 (Ext. 2604)', '', '', '', '6830', ''],
    ['47', 'DETROIT', 'Salón', '', '677206974 (Ext. 2644)', '', '', '', '6970', ''],
    ['48', 'MONACO', 'Salón', '', '677204042 (Ext. 2639)', '', '', '', '1530', ''],
    ['49', 'EUROPA', 'Salón', '', '677203965 (Ext. 2638)', '', '', '', '1170', ''],
    ['50', 'GOLDEN', 'Salón', '', '677204149 (Ext. 2641)', '', '', '', '6760', ''],
    ['51', 'MILENIUN', 'Salón', '', '677207459 (Ext. 2645)', '', '', '', '7000', ''],
    ['52', 'AFRICA', 'Salón', '', '677098392 (Ext. 2624)', '', '', '', '0810', ''],
    ['53', 'LETI', 'Salón', '', '677086592 (Ext. 2602)', '', '', '', '0200', ''],
    ['54', 'PALACE', 'Salón', '', '677203310 (Ext. 2636)', '', '', '', '0550', ''],
    ['55', 'MIAMI', 'Salón', '', '662118248 (Ext. 2649)', '', '', '', '7390', ''],
    ['56', 'CHAFIRAS', 'Salón', '', '', '', '', '', '0161', ''],
    ['57', 'COLOMBOFILO', 'Salón', '', '', '', '', '', '0031', ''],
    ['58', 'ESTRELLA', 'Salón', '', '', '', '', '', '0091', ''],
    ['59', 'LA CUESTA', 'Salón', '', '', '', '', '', '0011', ''],
    ['60', 'RIVER', 'Salón', '', '662118318 (Ext. 2650)', '', '', '', '7420', ''],
    ['61', 'STA CRUZ', 'Salón', '', '', '', '', '', '0121', ''],
    ['62', 'TROMPO', 'Salón', '', '', '', '', '', '0141', ''],
    ['63', '24 HORAS', 'Salón', '', '', '', '', '', '7430', '']
  ];
  
  sheet.getRange(1, 1, rawData.length, rawData[0].length).setValues(rawData);
}
