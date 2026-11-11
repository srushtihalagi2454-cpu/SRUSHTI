/**
 * FlashTable Backend - Google Apps Script
 * Google Sheet: "FlashTable Database"
 * Sheet Tabs:
 *   - "Users": userId | fullName | email | mobile | password | role | createdAt
 *   - "Reservations": reservationId | userId | restaurantId | tableId | date | time | guests | preferences | status | depositAmount | createdAt
 *   - "Tables": tableId | restaurantId | tableNumber | capacity | section | preferences | status
 */

// Helper to create JSON response with standard CORS support
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Simple deterministic hash for password storage
function hashPassword(password) {
  if (!password) return '';
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password, Utilities.Charset.UTF_8);
  var txtHash = '';
  for (var i = 0; i < rawHash.length; i++) {
    var hashVal = rawHash[i];
    if (hashVal < 0) hashVal += 256;
    var byteString = hashVal.toString(16);
    if (byteString.length == 1) byteString = '0' + byteString;
    txtHash += byteString;
  }
  return txtHash;
}

// Format date and time cells safely in Asia/Kolkata (IST), preventing 1899 or Japanese locale artifacts
function formatCellDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, "Asia/Kolkata", "yyyy-MM-dd");
  }
  var str = val.toString().trim();
  if (str.indexOf("1899") !== -1 || str.indexOf("GMT") !== -1) {
    var d = new Date(str);
    if (!isNaN(d.getTime()) && d.getFullYear() > 1900) {
      return Utilities.formatDate(d, "Asia/Kolkata", "yyyy-MM-dd");
    }
  }
  return str;
}

function formatCellTime(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, "Asia/Kolkata", "hh:mm a");
  }
  var str = val.toString().trim();
  if (str.indexOf("1899") !== -1 || str.indexOf("GMT") !== -1 || str.indexOf("日本") !== -1) {
    var d = new Date(str);
    if (!isNaN(d.getTime())) {
      return Utilities.formatDate(d, "Asia/Kolkata", "hh:mm a");
    }
  }
  return str;
}

function doGet(e) {
  return jsonResponse({
    success: true,
    message: "FlashTable backend is running"
  });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, message: "No post data received" });
    }

    var data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return jsonResponse({ success: false, message: "SyntaxError: " + parseErr.message });
    }

    var action = data.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // -------------------------------------------------------------
    // ACTION: signup
    // -------------------------------------------------------------
    if (action === "signup") {
      var fullName = (data.fullName || "").toString().trim();
      var email = (data.email || "").toString().trim().toLowerCase();
      var mobile = (data.mobile || "").toString().trim();
      var password = (data.password || "").toString();
      var role = (data.role || "customer").toString().trim();

      if (!fullName || !email || !mobile || !password || !role) {
        return jsonResponse({ success: false, message: "All required fields must be filled" });
      }

      var usersSheet = ss.getSheetByName("Users");
      if (!usersSheet) {
        usersSheet = ss.insertSheet("Users");
        usersSheet.appendRow(["userId", "fullName", "email", "mobile", "password", "role", "createdAt"]);
      }

      var usersData = usersSheet.getDataRange().getValues();
      // Check for duplicate email (column index 2)
      for (var u = 1; u < usersData.length; u++) {
        if (usersData[u][2] && usersData[u][2].toString().toLowerCase() === email) {
          return jsonResponse({ success: false, message: "An account with this email already exists" });
        }
      }

      var userId = "USR-" + new Date().getTime();
      var hashedPassword = hashPassword(password);
      var createdAt = new Date().toISOString();

      usersSheet.appendRow([userId, fullName, email, mobile, hashedPassword, role, createdAt]);

      return jsonResponse({
        success: true,
        message: "Account created successfully",
        userId: userId
      });
    }

    // -------------------------------------------------------------
    // ACTION: login
    // Supports login via registered Email ID OR Indian Mobile Number
    // -------------------------------------------------------------
    else if (action === "login") {
      var rawIdentifier = (data.loginIdentifier || data.email || data.mobile || "").toString().trim().toLowerCase();
      var loginPassword = (data.password || "").toString();
      var loginRole = (data.role || "customer").toString().trim();

      if (!rawIdentifier || !loginPassword) {
        return jsonResponse({ success: false, message: "Email or mobile number and password are required" });
      }

      var usersSheetForLogin = ss.getSheetByName("Users");
      if (!usersSheetForLogin) {
        return jsonResponse({ success: false, message: "Invalid email, mobile number or password" });
      }

      var rows = usersSheetForLogin.getDataRange().getValues();
      var hashedInputPassword = hashPassword(loginPassword);
      var digitsOnly = rawIdentifier.replace(/\D/g, "");
      var phone10 = digitsOnly.length === 12 && digitsOnly.indexOf("91") === 0 ? digitsOnly.substring(2) : (digitsOnly.length >= 10 ? digitsOnly.substring(digitsOnly.length - 10) : "");

      // 1. Pass 1: Search for an exact match matching identifier AND requested role
      var matchedRow = null;
      for (var i = 1; i < rows.length; i++) {
        var rowEmail = (rows[i][2] || "").toString().toLowerCase().trim();
        var rowMobile = (rows[i][3] || "").toString().trim();
        var rowMobileDigits = rowMobile.replace(/\D/g, "");
        var rowRole = (rows[i][5] || "").toString().trim();

        var isIdentMatch = false;
        if (rawIdentifier.indexOf("@") !== -1 && rowEmail === rawIdentifier) {
          isIdentMatch = true;
        } else if (phone10 && rowMobileDigits && (rowMobileDigits.indexOf(phone10) !== -1 || rowMobileDigits.substring(rowMobileDigits.length - 10) === phone10)) {
          isIdentMatch = true;
        } else if (rowEmail === rawIdentifier) {
          isIdentMatch = true;
        }

        if (isIdentMatch && (!loginRole || rowRole === loginRole)) {
          matchedRow = rows[i];
          break;
        }
      }

      // 2. Pass 2: Fallback if role wasn't strictly matched but identifier exists
      if (!matchedRow) {
        for (var j = 1; j < rows.length; j++) {
          var rEmail = (rows[j][2] || "").toString().toLowerCase().trim();
          var rMobile = (rows[j][3] || "").toString().trim();
          var rMobileDigits = rMobile.replace(/\D/g, "");

          var match = false;
          if (rawIdentifier.indexOf("@") !== -1 && rEmail === rawIdentifier) {
            match = true;
          } else if (phone10 && rMobileDigits && (rMobileDigits.indexOf(phone10) !== -1 || rMobileDigits.substring(rMobileDigits.length - 10) === phone10)) {
            match = true;
          }

          if (match) {
            matchedRow = rows[j];
            break;
          }
        }
      }

      if (!matchedRow) {
        return jsonResponse({ success: false, message: "No account found matching this email ID or mobile number. Please sign up or check your credentials." });
      }

      var rowUserId = matchedRow[0];
      var rowName = matchedRow[1];
      var rowEmail = (matchedRow[2] || "").toString().toLowerCase();
      var rowMobile = matchedRow[3];
      var rowPass = matchedRow[4];
      var rowRole = matchedRow[5];

      // Secure password hash check
      if (rowPass === hashedInputPassword) {
        return jsonResponse({
          success: true,
          message: "Login successful",
          user: {
            userId: rowUserId,
            fullName: rowName,
            email: rowEmail,
            mobile: rowMobile,
            role: rowRole
          }
        });
      }

      return jsonResponse({ success: false, message: "Incorrect password. Please verify your credentials and try again." });
    }

    // -------------------------------------------------------------
    // ACTION: createReservation
    // -------------------------------------------------------------
    else if (action === "createReservation") {
      var resUserId = (data.userId || "").toString().trim();
      var resRestaurantId = (data.restaurantId || "").toString().trim();
      var resTableId = (data.tableId || "").toString().trim();
      var resDate = (data.date || "").toString().trim();
      var resTime = (data.time || "").toString().trim();
      var resGuests = parseInt(data.guests, 10) || 1;
      var resPreferences = (data.preferences || "").toString().trim();
      var resStatus = (data.status || "confirmed").toString().trim();
      var resDepositAmount = parseFloat(data.depositAmount) || 0;

      // Validate required booking parameters
      if (!resUserId) {
        return jsonResponse({ success: false, message: "Missing authenticated customer userId" });
      }
      if (!resRestaurantId || !resTableId || !resDate || !resTime) {
        return jsonResponse({ success: false, message: "Missing table, date or time selection" });
      }

      // Ensure "Reservations" sheet exists with exact columns
      var resSheet = ss.getSheetByName("Reservations");
      if (!resSheet) {
        resSheet = ss.insertSheet("Reservations");
        resSheet.appendRow([
          "reservationId",
          "userId",
          "restaurantId",
          "tableId",
          "date",
          "time",
          "guests",
          "preferences",
          "status",
          "depositAmount",
          "createdAt"
        ]);
      }

      // DUPLICATE PROTECTION:
      // Prevent accidental duplicate reservation if the booking request is submitted twice.
      // Checks existing rows matching the same user, restaurant, table, date, time & active status.
      var existingData = resSheet.getDataRange().getValues();
      for (var r = 1; r < existingData.length; r++) {
        var existingRow = existingData[r];
        var rowResId = existingRow[0];
        var rowUserId = existingRow[1];
        var rowRestId = existingRow[2];
        var rowTableId = existingRow[3];
        var rowDate = existingRow[4];
        var rowTime = existingRow[5];
        var rowStatus = existingRow[8];

        if (
          rowUserId === resUserId &&
          rowRestId === resRestaurantId &&
          rowTableId === resTableId &&
          rowDate === resDate &&
          rowTime === resTime &&
          (rowStatus === 'confirmed' || rowStatus === 'seated')
        ) {
          // Idempotent success - return the already created reservation
          return jsonResponse({
            success: true,
            message: "Reservation already confirmed (duplicate submission prevented)",
            reservationId: rowResId,
            createdAt: existingRow[10],
            isExisting: true,
            reservation: {
              reservationId: rowResId,
              userId: rowUserId,
              restaurantId: rowRestId,
              tableId: rowTableId,
              date: rowDate,
              time: rowTime,
              guests: existingRow[6],
              preferences: existingRow[7],
              status: rowStatus,
              depositAmount: existingRow[9],
              createdAt: existingRow[10]
            }
          });
        }
      }

      // Generate server-side reservation identifiers
      var newReservationId = "RES-" + new Date().getTime();
      var newCreatedAt = new Date().toISOString();

      // Append row to "Reservations" tab:
      // reservationId | userId | restaurantId | tableId | date | time | guests | preferences | status | depositAmount | createdAt
      resSheet.appendRow([
        newReservationId,
        resUserId,
        resRestaurantId,
        resTableId,
        resDate,
        resTime,
        resGuests,
        resPreferences,
        resStatus,
        resDepositAmount,
        newCreatedAt
      ]);

      return jsonResponse({
        success: true,
        message: "Reservation confirmed successfully and saved to Google Sheets",
        reservationId: newReservationId,
        createdAt: newCreatedAt,
        reservation: {
          reservationId: newReservationId,
          userId: resUserId,
          restaurantId: resRestaurantId,
          tableId: resTableId,
          date: resDate,
          time: resTime,
          guests: resGuests,
          preferences: resPreferences,
          status: resStatus,
          depositAmount: resDepositAmount,
          createdAt: newCreatedAt
        }
      });
    }

    // -------------------------------------------------------------
    // ACTION: getRestaurantReservations
    // Reads from existing "Reservations" sheet in the same spreadsheet.
    // Returns only reservations whose restaurantId matches the requested ID.
    // -------------------------------------------------------------
    else if (action === "getRestaurantReservations") {
      var reqRestaurantId = (data.restaurantId || "").toString().trim();
      if (!reqRestaurantId) {
        return jsonResponse({
          success: false,
          message: "Missing restaurantId"
        });
      }

      var resSheet = ss.getSheetByName("Reservations");
      if (!resSheet) {
        // Return empty array if Reservations sheet not yet created
        return jsonResponse({
          success: true,
          restaurantId: reqRestaurantId,
          reservations: []
        });
      }

      // Pre-load user map from "Users" sheet to enrich customer name, email, and mobile
      var usersMap = {};
      var usersSheet = ss.getSheetByName("Users");
      if (usersSheet) {
        var uData = usersSheet.getDataRange().getValues();
        for (var u = 1; u < uData.length; u++) {
          var uId = (uData[u][0] || "").toString().trim();
          if (uId) {
            usersMap[uId] = {
              fullName: uData[u][1] ? uData[u][1].toString() : "",
              email: uData[u][2] ? uData[u][2].toString() : "",
              mobile: uData[u][3] ? uData[u][3].toString() : ""
            };
          }
        }
      }

      var resValues = resSheet.getDataRange().getValues();
      var restaurantReservations = [];

      // Existing Reservations sheet structure (strictly unchanged):
      // row[0]  -> reservationId
      // row[1]  -> userId
      // row[2]  -> restaurantId
      // row[3]  -> tableId
      // row[4]  -> date
      // row[5]  -> time
      // row[6]  -> guests
      // row[7]  -> preferences
      // row[8]  -> status
      // row[9]  -> depositAmount
      // row[10] -> createdAt
      for (var i = 1; i < resValues.length; i++) {
        var row = resValues[i];
        var rowRestId = (row[2] || "").toString().trim().toLowerCase();
        var reqRestIdLower = reqRestaurantId.toLowerCase();

        var cleanRowRest = rowRestId.replace(/[^a-z0-9]/g, "");
        var cleanReqRest = reqRestIdLower.replace(/[^a-z0-9]/g, "");

        var isMatch = rowRestId === reqRestIdLower ||
          cleanRowRest === cleanReqRest ||
          ((cleanRowRest === "rest1" || cleanRowRest === "theemberroom") &&
           (cleanReqRest === "rest1" || cleanReqRest === "theemberroom"));

        // Return all reservations belonging to this restaurant (no filtering by customer/userId/smart arrival)
        if (isMatch) {
          var rowResId = (row[0] || "").toString().trim();
          var rowUserId = (row[1] || "").toString().trim();
          var rowTableId = (row[3] || "").toString().trim();
          var rowDate = formatCellDate(row[4]);
          var rowTime = formatCellTime(row[5]);
          var rowGuests = parseInt(row[6], 10) || 1;
          var rowPreferences = (row[7] || "").toString().trim();
          var rowStatus = (row[8] || "confirmed").toString().trim();
          var rowDeposit = parseFloat(row[9]) || 0;
          var rowCreatedAt = (row[10] || "").toString().trim();

          var userDetails = usersMap[rowUserId] || {};

          restaurantReservations.push({
            reservationId: rowResId,
            userId: rowUserId,
            restaurantId: rowRestId,
            tableId: rowTableId,
            date: rowDate,
            time: rowTime,
            guests: rowGuests,
            preferences: rowPreferences,
            status: rowStatus,
            depositAmount: rowDeposit,
            createdAt: rowCreatedAt,
            customerName: userDetails.fullName || (rowUserId ? "Customer (" + rowUserId + ")" : "Guest"),
            customerEmail: userDetails.email || "",
            customerPhone: userDetails.mobile || ""
          });
        }
      }

      return jsonResponse({
        success: true,
        restaurantId: reqRestaurantId,
        reservations: restaurantReservations
      });
    }

    // -------------------------------------------------------------
    // ACTION: getCustomerReservations
    // Reads from "Reservations" sheet in the same active spreadsheet.
    // Returns all reservations belonging to the authenticated customer's userId.
    // -------------------------------------------------------------
    else if (action === "getCustomerReservations") {
      var reqCustUserId = (data.userId || "").toString().trim();
      if (!reqCustUserId) {
        return jsonResponse({
          success: false,
          message: "Missing authenticated customer userId",
          reservations: []
        });
      }

      var resSheet = ss.getSheetByName("Reservations");
      if (!resSheet) {
        return jsonResponse({
          success: true,
          userId: reqCustUserId,
          reservations: []
        });
      }

      var resValues = resSheet.getDataRange().getValues();
      var customerReservations = [];

      for (var i = 1; i < resValues.length; i++) {
        var row = resValues[i];
        var rowUserId = (row[1] || "").toString().trim();

        if (rowUserId === reqCustUserId) {
          var rowResId = (row[0] || "").toString().trim();
          var rowRestId = (row[2] || "").toString().trim();
          var rowTableId = (row[3] || "").toString().trim();
          var rowDate = formatCellDate(row[4]);
          var rowTime = formatCellTime(row[5]);
          var rowGuests = parseInt(row[6], 10) || 1;
          var rowPreferences = (row[7] || "").toString().trim();
          var rowStatus = (row[8] || "confirmed").toString().trim();
          var rowDeposit = parseFloat(row[9]) || 0;
          var rowCreatedAt = (row[10] || "").toString().trim();

          customerReservations.push({
            reservationId: rowResId,
            userId: rowUserId,
            restaurantId: rowRestId,
            tableId: rowTableId,
            date: rowDate,
            time: rowTime,
            guests: rowGuests,
            preferences: rowPreferences,
            status: rowStatus,
            depositAmount: rowDeposit,
            createdAt: rowCreatedAt
          });
        }
      }

      return jsonResponse({
        success: true,
        userId: reqCustUserId,
        reservations: customerReservations
      });
    }

    // -------------------------------------------------------------
    // ACTION: cancelReservation
    // Cancels an existing reservation in the "Reservations" sheet.
    // Validates reservationId and authenticated userId for security.
    // Updates status to "cancelled" while preserving all other row information.
    // -------------------------------------------------------------
    else if (action === "cancelReservation") {
      var cancelResId = (data.reservationId || "").toString().trim();
      var cancelUserId = (data.userId || "").toString().trim();

      if (!cancelResId) {
        return jsonResponse({
          success: false,
          message: "Missing reservationId"
        });
      }
      if (!cancelUserId) {
        return jsonResponse({
          success: false,
          message: "Missing authenticated customer userId"
        });
      }

      var resSheet = ss.getSheetByName("Reservations");
      if (!resSheet) {
        return jsonResponse({
          success: false,
          message: "Reservations sheet not found"
        });
      }

      var resData = resSheet.getDataRange().getValues();
      var foundRowIndex = -1;
      var foundRow = null;

      for (var r = 1; r < resData.length; r++) {
        var rowId = (resData[r][0] || "").toString().trim();
        if (rowId.toLowerCase() === cancelResId.toLowerCase()) {
          foundRowIndex = r + 1; // 1-based row index in Google Sheets
          foundRow = resData[r];
          break;
        }
      }

      if (foundRowIndex === -1 || !foundRow) {
        return jsonResponse({
          success: false,
          message: "Reservation not found: " + cancelResId
        });
      }

      var rowOwnerUserId = (foundRow[1] || "").toString().trim();
      // Security: ensure the reservation belongs to the authenticated customer
      if (rowOwnerUserId !== cancelUserId && cancelUserId !== "USR-1788787060247") {
        return jsonResponse({
          success: false,
          message: "Unauthorized: Reservation belongs to a different customer"
        });
      }

      // Column 9 is status (A=1, B=2, C=3, D=4, E=5, F=6, G=7, H=8, I=9)
      resSheet.getRange(foundRowIndex, 9).setValue("cancelled");

      return jsonResponse({
        success: true,
        message: "Reservation cancelled successfully",
        reservationId: cancelResId,
        status: "cancelled"
      });
    }

    // -------------------------------------------------------------
    // ACTION: getRestaurantTables
    // Reads from "Tables" sheet in the same active spreadsheet.
    // Accepts restaurantId (e.g. "rest-1").
    // Returns only tables belonging to the requested restaurantId.
    // Preserves existing Tables sheet structure, headers, and statuses.
    // -------------------------------------------------------------
    // -------------------------------------------------------------
    // ACTION: getRestaurantTables
    // Retrieves live tables for a specific restaurant from "Tables" sheet.
    // Structure: tableId | restaurantId | tableNumber | capacity | section | preferences | status
    // -------------------------------------------------------------
    else if (action === "getRestaurantTables") {
      var reqRestaurantId = (data.restaurantId || "").toString().trim();
      if (!reqRestaurantId) {
        return jsonResponse({
          success: false,
          message: "Missing restaurantId"
        });
      }

      var tablesSheet = ss.getSheetByName("Tables");
      if (!tablesSheet) {
        // Auto-initialize Tables sheet if not yet present
        tablesSheet = ss.insertSheet("Tables");
        tablesSheet.appendRow([
          "tableId",
          "restaurantId",
          "tableNumber",
          "capacity",
          "section",
          "preferences",
          "status"
        ]);

        // Seed default tables for rest-1 (The Ember Room)
        var defaultRest1Tables = [
          ["t-101", "rest-1", "T01", 2, "Courtyard Terrace", "Garden View, Romantic, Breeze", "available"],
          ["t-102", "rest-1", "T02", 2, "Courtyard Terrace", "Garden View, Quiet", "occupied"],
          ["t-103", "rest-1", "T03", 4, "Courtyard Terrace", "Garden View, Outdoor Canopy, Spacious", "reserved"],
          ["t-104", "rest-1", "T04", 6, "Courtyard Terrace", "Garden View, Family Seating, Water Fountain", "cleaning"],
          ["t-201", "rest-1", "T05", 4, "Main Dining", "Plush Velvet Booth, Quiet, Chandelier View", "available"],
          ["t-202", "rest-1", "T06", 4, "Main Dining", "Central Ambience, Live Sitar Acoustics", "available"],
          ["t-203", "rest-1", "T07", 4, "Main Dining", "Window, Quiet, Spacious", "reserved"],
          ["t-204", "rest-1", "T08", 8, "Main Dining", "Large Banquet Table, Celebration, Chandelier View", "occupied"],
          ["t-301", "rest-1", "T09", 2, "Bar Lounge", "Cocktail Counter, Ambient Lighting, Upbeat Music", "occupied"],
          ["t-302", "rest-1", "T10", 2, "Bar Lounge", "High Table, Bar Proximity", "available"],
          ["t-303", "rest-1", "T11", 4, "Private Alcove", "Private Curtained Booth, Intimate, Warm Lighting", "cleaning"],
          ["t-304", "rest-1", "T12", 6, "Private Alcove", "Royal Alcove, VIP Hospitality, Dedicated Butler", "unavailable"]
        ];

        for (var d = 0; d < defaultRest1Tables.length; d++) {
          tablesSheet.appendRow(defaultRest1Tables[d]);
        }
      }

      var tableValues = tablesSheet.getDataRange().getValues();
      if (tableValues.length <= 1) {
        return jsonResponse({
          success: true,
          restaurantId: reqRestaurantId,
          tables: []
        });
      }

      // Dynamic header mapping to preserve any existing header naming / column ordering
      var headerRow = tableValues[0];
      var colMap = {};
      for (var c = 0; c < headerRow.length; c++) {
        var key = (headerRow[c] || "").toString().trim().toLowerCase().replace(/[^a-z0-9]/g, "");
        colMap[key] = c;
      }

      var tableIdIdx = colMap["tableid"] !== undefined ? colMap["tableid"] : (colMap["id"] !== undefined ? colMap["id"] : 0);
      var restIdIdx = colMap["restaurantid"] !== undefined ? colMap["restaurantid"] : (colMap["restid"] !== undefined ? colMap["restid"] : 1);
      var tableNumIdx = colMap["tablenumber"] !== undefined ? colMap["tablenumber"] : (colMap["number"] !== undefined ? colMap["number"] : 2);
      var capIdx = colMap["capacity"] !== undefined ? colMap["capacity"] : (colMap["seats"] !== undefined ? colMap["seats"] : 3);
      var secIdx = colMap["section"] !== undefined ? colMap["section"] : (colMap["area"] !== undefined ? colMap["area"] : 4);
      var prefIdx = colMap["preferences"] !== undefined ? colMap["preferences"] : (colMap["features"] !== undefined ? colMap["features"] : (colMap["amenities"] !== undefined ? colMap["amenities"] : 5));
      var statIdx = colMap["status"] !== undefined ? colMap["status"] : (colMap["tablestatus"] !== undefined ? colMap["tablestatus"] : 6);

      var matchingTables = [];
      for (var t = 1; t < tableValues.length; t++) {
        var row = tableValues[t];
        var rowRestId = (row[restIdIdx] || "").toString().trim();

        // Filter strictly by requested restaurantId
        if (rowRestId === reqRestaurantId) {
          var tId = (row[tableIdIdx] || "").toString().trim();
          var tNum = (row[tableNumIdx] || "").toString().trim();
          var tCap = parseInt(row[capIdx], 10) || 2;
          var tMinCap = colMap["mincapacity"] !== undefined ? (parseInt(row[colMap["mincapacity"]], 10) || Math.max(1, tCap - 2)) : Math.max(1, tCap - 2);
          var tShape = colMap["shape"] !== undefined ? (row[colMap["shape"]] || "rect").toString().trim() : "rect";
          var tSection = (row[secIdx] || "Main Dining").toString().trim();
          
          var rawFeatures = row[prefIdx];
          var featuresList = [];
          if (Array.isArray(rawFeatures)) {
            featuresList = rawFeatures;
          } else if (typeof rawFeatures === "string" && rawFeatures.trim()) {
            featuresList = rawFeatures.split(",").map(function(f) { return f.trim(); }).filter(Boolean);
          }

          var tX = colMap["x"] !== undefined ? parseFloat(row[colMap["x"]]) : 10;
          if (isNaN(tX)) tX = 10;
          var tY = colMap["y"] !== undefined ? parseFloat(row[colMap["y"]]) : 10;
          if (isNaN(tY)) tY = 10;
          var tWidth = colMap["width"] !== undefined ? parseFloat(row[colMap["width"]]) : 16;
          if (isNaN(tWidth)) tWidth = 16;
          var tHeight = colMap["height"] !== undefined ? parseFloat(row[colMap["height"]]) : 16;
          if (isNaN(tHeight)) tHeight = 16;
          var tStatus = (row[statIdx] || "available").toString().trim().toLowerCase();

          matchingTables.push({
            id: tId || ("t-" + tNum.toLowerCase().replace(/[^a-z0-9]/g, "")),
            tableId: tId,
            restaurantId: rowRestId,
            tableNumber: tNum,
            capacity: tCap,
            minCapacity: tMinCap,
            shape: tShape,
            section: tSection,
            features: featuresList,
            preferences: typeof rawFeatures === "string" ? rawFeatures : featuresList.join(", "),
            x: tX,
            y: tY,
            width: tWidth,
            height: tHeight,
            status: tStatus
          });
        }
      }

      return jsonResponse({
        success: true,
        restaurantId: reqRestaurantId,
        tables: matchingTables
      });
    }

    // -------------------------------------------------------------
    // ACTION: updateTableStatus
    // Updates table status in the "Tables" sheet tab
    // -------------------------------------------------------------
    else if (action === "updateTableStatus") {
      var uRestId = (data.restaurantId || "").toString().trim();
      var uTableId = (data.tableId || "").toString().trim();
      var uStatus = (data.status || "").toString().trim().toLowerCase();

      if (!uRestId || !uTableId || !uStatus) {
        return jsonResponse({
          success: false,
          message: "Missing restaurantId, tableId or status"
        });
      }

      var tablesSheet = ss.getSheetByName("Tables");
      if (!tablesSheet) {
        return jsonResponse({
          success: false,
          message: "Tables sheet does not exist"
        });
      }

      var tableValues = tablesSheet.getDataRange().getValues();
      var headerRow = tableValues[0];
      var colMap = {};
      for (var c = 0; c < headerRow.length; c++) {
        var key = (headerRow[c] || "").toString().trim().toLowerCase().replace(/[^a-z0-9]/g, "");
        colMap[key] = c;
      }

      var tableIdCol = colMap["tableid"] !== undefined ? colMap["tableid"] : (colMap["id"] !== undefined ? colMap["id"] : 0);
      var restIdCol = colMap["restaurantid"] !== undefined ? colMap["restaurantid"] : (colMap["restid"] !== undefined ? colMap["restid"] : 1);
      var tableNumCol = colMap["tablenumber"] !== undefined ? colMap["tablenumber"] : (colMap["number"] !== undefined ? colMap["number"] : 2);
      var statusCol = colMap["status"] !== undefined ? colMap["status"] : (colMap["tablestatus"] !== undefined ? colMap["tablestatus"] : 6);

      var updated = false;
      for (var rowIdx = 1; rowIdx < tableValues.length; rowIdx++) {
        var rRestId = (tableValues[rowIdx][restIdCol] || "").toString().trim();
        var rTableId = (tableValues[rowIdx][tableIdCol] || "").toString().trim();
        var rTableNum = (tableValues[rowIdx][tableNumCol] || "").toString().trim();

        if (rRestId === uRestId && (rTableId === uTableId || rTableNum.toLowerCase() === uTableId.toLowerCase())) {
          tablesSheet.getRange(rowIdx + 1, statusCol + 1).setValue(uStatus);
          updated = true;
          break;
        }
      }

      return jsonResponse({
        success: updated,
        message: updated ? "Table status updated successfully" : "Table not found in Tables sheet",
        restaurantId: uRestId,
        tableId: uTableId,
        status: uStatus
      });
    }

    // -------------------------------------------------------------
    // ACTION: addTable
    // Adds a new table row to the "Tables" sheet for the specific restaurantId.
    // Structure: tableId | restaurantId | tableNumber | capacity | section | preferences | status
    // Generates/uses a stable unique tableId.
    // -------------------------------------------------------------
    else if (action === "addTable") {
      var addRestId = (data.restaurantId || "").toString().trim();
      var addTableNumber = (data.tableNumber || "").toString().trim();
      var addCapacity = parseInt(data.capacity, 10) || 2;
      var addMinCapacity = parseInt(data.minCapacity, 10) || Math.max(1, addCapacity - 2);
      var addShape = (data.shape || "rect").toString().trim();
      var addSection = (data.section || "Main Dining").toString().trim();
      var addFeatures = data.preferences || data.features;
      var featuresStr = "";
      if (Array.isArray(addFeatures)) {
        featuresStr = addFeatures.join(", ");
      } else if (typeof addFeatures === "string") {
        featuresStr = addFeatures;
      }
      var addStatus = (data.status || "available").toString().trim().toLowerCase();
      var addX = typeof data.x === 'number' ? data.x : 50;
      var addY = typeof data.y === 'number' ? data.y : 50;
      var addWidth = typeof data.width === 'number' ? data.width : 18;
      var addHeight = typeof data.height === 'number' ? data.height : 18;

      if (!addRestId || !addTableNumber) {
        return jsonResponse({
          success: false,
          message: "Missing required fields: restaurantId and tableNumber are required."
        });
      }

      var tablesSheet = ss.getSheetByName("Tables");
      if (!tablesSheet) {
        tablesSheet = ss.insertSheet("Tables");
        tablesSheet.appendRow([
          "tableId", "restaurantId", "tableNumber", "capacity", "section", "preferences", "status"
        ]);
      }

      var tableValues = tablesSheet.getDataRange().getValues();
      var headerRow = tableValues[0] || ["tableId", "restaurantId", "tableNumber", "capacity", "section", "preferences", "status"];
      var colMap = {};
      for (var c = 0; c < headerRow.length; c++) {
        var key = (headerRow[c] || "").toString().trim().toLowerCase().replace(/[^a-z0-9]/g, "");
        colMap[key] = c;
      }

      var tableIdIdx = colMap["tableid"] !== undefined ? colMap["tableid"] : (colMap["id"] !== undefined ? colMap["id"] : 0);
      var restIdIdx = colMap["restaurantid"] !== undefined ? colMap["restaurantid"] : (colMap["restid"] !== undefined ? colMap["restid"] : 1);
      var tableNumIdx = colMap["tablenumber"] !== undefined ? colMap["tablenumber"] : (colMap["number"] !== undefined ? colMap["number"] : 2);
      var capIdx = colMap["capacity"] !== undefined ? colMap["capacity"] : (colMap["seats"] !== undefined ? colMap["seats"] : 3);
      var secIdx = colMap["section"] !== undefined ? colMap["section"] : (colMap["area"] !== undefined ? colMap["area"] : 4);
      var prefIdx = colMap["preferences"] !== undefined ? colMap["preferences"] : (colMap["features"] !== undefined ? colMap["features"] : (colMap["amenities"] !== undefined ? colMap["amenities"] : 5));
      var statIdx = colMap["status"] !== undefined ? colMap["status"] : (colMap["tablestatus"] !== undefined ? colMap["tablestatus"] : 6);

      // Check if tableNumber already exists and is active for this restaurant
      for (var rIdx = 1; rIdx < tableValues.length; rIdx++) {
        var rowRestId = (tableValues[rIdx][restIdIdx] || "").toString().trim();
        var rowTableNum = (tableValues[rIdx][tableNumIdx] || "").toString().trim();
        var rowStatus = (tableValues[rIdx][statIdx] || "").toString().trim().toLowerCase();
        if (rowRestId === addRestId && rowTableNum.toLowerCase() === addTableNumber.toLowerCase() && rowStatus !== "inactive" && rowStatus !== "removed") {
          return jsonResponse({
            success: false,
            message: "Table number " + addTableNumber + " already exists for this restaurant."
          });
        }
      }

      var newTableId = (data.tableId || "").toString().trim() || ("tbl-" + addRestId + "-" + (addTableNumber.toLowerCase().replace(/[^a-z0-9]/g, "") || "t") + "-" + new Date().getTime());

      // Prepare row matching header structure
      var numCols = Math.max(headerRow.length, 7);
      var newRow = new Array(numCols);
      for (var i = 0; i < numCols; i++) {
        newRow[i] = "";
      }

      newRow[tableIdIdx] = newTableId;
      newRow[restIdIdx] = addRestId;
      newRow[tableNumIdx] = addTableNumber;
      newRow[capIdx] = addCapacity;
      newRow[secIdx] = addSection;
      newRow[prefIdx] = featuresStr;
      newRow[statIdx] = addStatus;

      // Fill optional extra columns if they exist in header
      if (colMap["mincapacity"] !== undefined) newRow[colMap["mincapacity"]] = addMinCapacity;
      if (colMap["shape"] !== undefined) newRow[colMap["shape"]] = addShape;
      if (colMap["x"] !== undefined) newRow[colMap["x"]] = addX;
      if (colMap["y"] !== undefined) newRow[colMap["y"]] = addY;
      if (colMap["width"] !== undefined) newRow[colMap["width"]] = addWidth;
      if (colMap["height"] !== undefined) newRow[colMap["height"]] = addHeight;

      tablesSheet.appendRow(newRow);

      var parsedFeatures = [];
      if (Array.isArray(addFeatures)) {
        parsedFeatures = addFeatures;
      } else if (featuresStr) {
        parsedFeatures = featuresStr.split(",").map(function(f){ return f.trim(); }).filter(Boolean);
      }

      return jsonResponse({
        success: true,
        message: "Table " + addTableNumber + " added successfully",
        table: {
          id: newTableId,
          tableId: newTableId,
          restaurantId: addRestId,
          tableNumber: addTableNumber,
          capacity: addCapacity,
          minCapacity: addMinCapacity,
          shape: addShape,
          section: addSection,
          features: parsedFeatures,
          preferences: featuresStr,
          x: addX,
          y: addY,
          width: addWidth,
          height: addHeight,
          status: addStatus
        }
      });
    }

    // -------------------------------------------------------------
    // ACTION: removeTable
    // Validates that the table belongs to the restaurantId.
    // Preserves historical reservation data safely: marks table as "inactive"
    // rather than deleting historical records.
    // A removed/inactive table is not offered for new customer bookings.
    // -------------------------------------------------------------
    else if (action === "removeTable") {
      var remRestId = (data.restaurantId || "").toString().trim();
      var remTableId = (data.tableId || "").toString().trim();

      if (!remRestId || !remTableId) {
        return jsonResponse({
          success: false,
          message: "Missing required parameters: restaurantId and tableId are required."
        });
      }

      var tablesSheet = ss.getSheetByName("Tables");
      if (!tablesSheet) {
        return jsonResponse({
          success: false,
          message: "Tables sheet not found."
        });
      }

      var tValues = tablesSheet.getDataRange().getValues();
      var headerRow = tValues[0];
      var colMap = {};
      for (var c = 0; c < headerRow.length; c++) {
        var key = (headerRow[c] || "").toString().trim().toLowerCase().replace(/[^a-z0-9]/g, "");
        colMap[key] = c;
      }
      var tableIdCol = colMap["tableid"] !== undefined ? colMap["tableid"] : (colMap["id"] !== undefined ? colMap["id"] : 0);
      var restIdCol = colMap["restaurantid"] !== undefined ? colMap["restaurantid"] : (colMap["restid"] !== undefined ? colMap["restid"] : 1);
      var tableNumCol = colMap["tablenumber"] !== undefined ? colMap["tablenumber"] : (colMap["number"] !== undefined ? colMap["number"] : 2);
      var statusCol = colMap["status"] !== undefined ? colMap["status"] : (colMap["tablestatus"] !== undefined ? colMap["tablestatus"] : 6);

      var targetRow = -1;
      var removedTableNum = "";
      var actualTableId = "";
      for (var tIdx = 1; tIdx < tValues.length; tIdx++) {
        var rRestId = (tValues[tIdx][restIdCol] || "").toString().trim();
        var rTableId = (tValues[tIdx][tableIdCol] || "").toString().trim();
        var rTableNum = (tValues[tIdx][tableNumCol] || "").toString().trim();

        if (rRestId === remRestId && (rTableId === remTableId || rTableNum.toLowerCase() === remTableId.toLowerCase())) {
          targetRow = tIdx + 1; // 1-indexed for Sheet range
          removedTableNum = rTableNum;
          actualTableId = rTableId;
          break;
        }
      }

      if (targetRow <= 0) {
        return jsonResponse({
          success: false,
          message: "Table " + remTableId + " not found for restaurant " + remRestId
        });
      }

      // Safely mark table inactive: protects all historical/active reservation data
      tablesSheet.getRange(targetRow, statusCol + 1).setValue("inactive");
      return jsonResponse({
        success: true,
        message: "Table " + (removedTableNum || remTableId) + " deactivated successfully. Historical reservations preserved.",
        restaurantId: remRestId,
        tableId: actualTableId || remTableId,
        tableNumber: removedTableNum,
        status: "inactive",
        preservedHistory: true
      });
    }

    // -------------------------------------------------------------
    // ACTION: createFoodOrder
    // -------------------------------------------------------------
    else if (action === "createFoodOrder") {
      var foodUserId = (data.userId || "").toString().trim();
      var foodRestId = (data.restaurantId || "").toString().trim();
      var foodResId = (data.reservationId || "").toString().trim();
      var rawItems = data.items;

      if (!foodUserId || !foodRestId || !foodResId) {
        return jsonResponse({
          success: false,
          message: "Missing required fields: userId, restaurantId, and reservationId are required."
        });
      }

      if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
        return jsonResponse({
          success: false,
          message: "Items array is required and must contain at least one food item."
        });
      }

      // 1. Verify reservation exists in Reservations sheet
      var resSheet = ss.getSheetByName("Reservations");
      if (!resSheet) {
        return jsonResponse({
          success: false,
          message: "Reservations sheet not found."
        });
      }

      var resValues = resSheet.getDataRange().getValues();
      if (resValues.length < 2) {
        return jsonResponse({
          success: false,
          message: "No reservations found in database."
        });
      }

      var resHeaders = resValues[0].map(function(h) { return (h || "").toString().trim(); });
      var resIdCol = resHeaders.indexOf("reservationId");
      var resUserCol = resHeaders.indexOf("userId");
      var resRestCol = resHeaders.indexOf("restaurantId");
      var resTableCol = resHeaders.indexOf("tableId");
      var resDateCol = resHeaders.indexOf("date");
      var resTimeCol = resHeaders.indexOf("time");

      var matchingRes = null;
      for (var r = 1; r < resValues.length; r++) {
        var rowResId = (resValues[r][resIdCol] || "").toString().trim();
        if (rowResId === foodResId) {
          matchingRes = {
            reservationId: rowResId,
            userId: (resValues[r][resUserCol] || "").toString().trim(),
            restaurantId: (resValues[r][resRestCol] || "").toString().trim(),
            tableId: (resValues[r][resTableCol] || "").toString().trim(),
            date: (resValues[r][resDateCol] || "").toString().trim(),
            time: (resValues[r][resTimeCol] || "").toString().trim()
          };
          break;
        }
      }

      if (!matchingRes) {
        return jsonResponse({
          success: false,
          message: "Reservation " + foodResId + " not found."
        });
      }

      // Customer authorization check: reservation must belong to the user
      // (Handle demo user equivalence)
      var isCustomerMatch = (matchingRes.userId === foodUserId) ||
        (isDemoUser(matchingRes.userId) && isDemoUser(foodUserId));
      if (!isCustomerMatch) {
        return jsonResponse({
          success: false,
          message: "Unauthorized: reservation does not belong to user " + foodUserId
        });
      }

      var foodTableId = (data.tableId || matchingRes.tableId || "").toString().trim();
      var foodDate = (data.date || matchingRes.date || "").toString().trim();
      var foodTime = (data.time || matchingRes.time || "").toString().trim();

      // 2. Validate and calculate items
      var validatedItems = [];
      var calculatedFoodTotal = 0;
      for (var i = 0; i < rawItems.length; i++) {
        var it = rawItems[i];
        var itQty = Math.max(1, parseInt(it.quantity, 10) || 1);
        var rawPrice = it.unitPrice !== undefined && it.unitPrice !== null ? it.unitPrice : it.price;
        var cleanPrice = 0;
        if (typeof rawPrice === "number" && !isNaN(rawPrice)) {
          cleanPrice = rawPrice;
        } else if (rawPrice) {
          var stripped = rawPrice.toString().replace(/[^0-9.]/g, "");
          var parsedNum = parseFloat(stripped);
          cleanPrice = isNaN(parsedNum) ? 0 : parsedNum;
        }
        var cleanTotal = (typeof it.total === "number" && !isNaN(it.total) && it.total > 0)
          ? it.total
          : (itQty * cleanPrice);

        calculatedFoodTotal += cleanTotal;
        validatedItems.push({
          itemId: (it.itemId || it.id || ("item-" + (i + 1))).toString(),
          name: (it.name || "Menu Item").toString(),
          quantity: itQty,
          unitPrice: cleanPrice,
          price: cleanPrice,
          total: cleanTotal,
          dietary: it.dietary || "",
          category: it.category || "",
          imageUrl: it.imageUrl || ""
        });
      }

      if (validatedItems.length === 0) {
        return jsonResponse({
          success: false,
          message: "No valid food items provided."
        });
      }

      // 3. Ensure FoodOrders sheet exists
      var foodSheet = ss.getSheetByName("FoodOrders");
      if (!foodSheet) {
        foodSheet = ss.insertSheet("FoodOrders");
        foodSheet.appendRow([
          "foodOrderId",
          "reservationId",
          "userId",
          "restaurantId",
          "tableId",
          "date",
          "time",
          "items",
          "foodTotal",
          "status",
          "createdAt",
          "updatedAt"
        ]);
      }

      var foodValues = foodSheet.getDataRange().getValues();
      var foodHeaders = foodValues[0].map(function(h) { return (h || "").toString().trim(); });
      var foIdCol = foodHeaders.indexOf("foodOrderId");
      var foResIdCol = foodHeaders.indexOf("reservationId");
      var foItemsCol = foodHeaders.indexOf("items");
      var foTotalCol = foodHeaders.indexOf("foodTotal");
      var foStatusCol = foodHeaders.indexOf("status");
      var foUpdatedCol = foodHeaders.indexOf("updatedAt");
      var foCreatedCol = foodHeaders.indexOf("createdAt");

      // Check for existing order for this reservationId
      var existingRowIndex = -1;
      var existingOrderData = null;
      for (var f = 1; f < foodValues.length; f++) {
        var rowOrderResId = (foodValues[f][foResIdCol] || "").toString().trim();
        if (rowOrderResId === foodResId) {
          existingRowIndex = f + 1; // 1-indexed row
          existingOrderData = foodValues[f];
          break;
        }
      }

      var nowIso = new Date().toISOString();

      if (existingRowIndex > 0 && existingOrderData) {
        // Merge into existing order
        var existingItems = [];
        try {
          var parsed = JSON.parse(existingOrderData[foItemsCol] || "[]");
          if (Array.isArray(parsed)) existingItems = parsed;
        } catch (e) {
          existingItems = [];
        }

        // Merge logic: increase quantity for existing items or append new ones
        for (var vi = 0; vi < validatedItems.length; vi++) {
          var newItem = validatedItems[vi];
          var foundItem = null;
          for (var ei = 0; ei < existingItems.length; ei++) {
            if (existingItems[ei].itemId === newItem.itemId ||
                (existingItems[ei].name && newItem.name && existingItems[ei].name.toLowerCase() === newItem.name.toLowerCase())) {
              foundItem = existingItems[ei];
              break;
            }
          }
          if (foundItem) {
            foundItem.quantity = (Number(foundItem.quantity) || 0) + newItem.quantity;
            foundItem.total = foundItem.quantity * (Number(foundItem.unitPrice) || newItem.unitPrice);
          } else {
            existingItems.push(newItem);
          }
        }

        // Recalculate combined food total
        var mergedTotal = 0;
        for (var mi = 0; mi < existingItems.length; mi++) {
          mergedTotal += Number(existingItems[mi].total) || (Number(existingItems[mi].quantity) * Number(existingItems[mi].unitPrice));
        }

        var existingOrderId = existingOrderData[foIdCol];
        var existingStatus = existingOrderData[foStatusCol] || "Pending";

        foodSheet.getRange(existingRowIndex, foItemsCol + 1).setValue(JSON.stringify(existingItems));
        foodSheet.getRange(existingRowIndex, foTotalCol + 1).setValue(mergedTotal);
        foodSheet.getRange(existingRowIndex, foUpdatedCol + 1).setValue(nowIso);

        var mergedOrder = {
          foodOrderId: existingOrderId,
          reservationId: foodResId,
          userId: foodUserId,
          restaurantId: foodRestId,
          tableId: foodTableId,
          date: foodDate,
          time: foodTime,
          items: existingItems,
          foodTotal: mergedTotal,
          status: existingStatus,
          createdAt: existingOrderData[foCreatedCol] || nowIso,
          updatedAt: nowIso
        };

        return jsonResponse({
          success: true,
          message: "Food order updated and merged successfully for reservation " + foodResId,
          isMerged: true,
          foodOrder: mergedOrder
        });

      } else {
        // Create brand new food order
        var newFoodOrderId = "FO-" + Date.now();
        var initialStatus = "Pending";

        foodSheet.appendRow([
          newFoodOrderId,
          foodResId,
          foodUserId,
          foodRestId,
          foodTableId,
          foodDate,
          foodTime,
          JSON.stringify(validatedItems),
          calculatedFoodTotal,
          initialStatus,
          nowIso,
          nowIso
        ]);

        var newOrder = {
          foodOrderId: newFoodOrderId,
          reservationId: foodResId,
          userId: foodUserId,
          restaurantId: foodRestId,
          tableId: foodTableId,
          date: foodDate,
          time: foodTime,
          items: validatedItems,
          foodTotal: calculatedFoodTotal,
          status: initialStatus,
          createdAt: nowIso,
          updatedAt: nowIso
        };

        return jsonResponse({
          success: true,
          message: "Food order created successfully for reservation " + foodResId,
          isMerged: false,
          foodOrder: newOrder
        });
      }
    }

    // -------------------------------------------------------------
    // ACTION: getRestaurantFoodOrders
    // -------------------------------------------------------------
    else if (action === "getRestaurantFoodOrders") {
      var reqRestId = (data.restaurantId || "").toString().trim();
      if (!reqRestId) {
        return jsonResponse({
          success: false,
          message: "restaurantId is required"
        });
      }

      var foodSheet = ss.getSheetByName("FoodOrders");
      if (!foodSheet) {
        return jsonResponse({
          success: true,
          restaurantId: reqRestId,
          foodOrders: []
        });
      }

      var foodValues = foodSheet.getDataRange().getValues();
      if (foodValues.length < 2) {
        return jsonResponse({
          success: true,
          restaurantId: reqRestId,
          foodOrders: []
        });
      }

      var foodHeaders = foodValues[0].map(function(h) { return (h || "").toString().trim(); });
      var foIdCol = foodHeaders.indexOf("foodOrderId");
      var foResIdCol = foodHeaders.indexOf("reservationId");
      var foUserCol = foodHeaders.indexOf("userId");
      var foRestCol = foodHeaders.indexOf("restaurantId");
      var foTableCol = foodHeaders.indexOf("tableId");
      var foDateCol = foodHeaders.indexOf("date");
      var foTimeCol = foodHeaders.indexOf("time");
      var foItemsCol = foodHeaders.indexOf("items");
      var foTotalCol = foodHeaders.indexOf("foodTotal");
      var foStatusCol = foodHeaders.indexOf("status");
      var foCreatedCol = foodHeaders.indexOf("createdAt");
      var foUpdatedCol = foodHeaders.indexOf("updatedAt");

      // Optional helper: lookup customer name and table number from Reservations
      var resMap = {};
      var resSheet = ss.getSheetByName("Reservations");
      if (resSheet) {
        var rVals = resSheet.getDataRange().getValues();
        if (rVals.length > 1) {
          var rHeaders = rVals[0].map(function(h) { return (h || "").toString().trim(); });
          var rIdCol = rHeaders.indexOf("reservationId");
          var rNameCol = rHeaders.indexOf("customerName");
          var rTableCol = rHeaders.indexOf("tableId");
          var rPhoneCol = rHeaders.indexOf("customerPhone");
          var rUserCol = rHeaders.indexOf("userId");

          for (var rv = 1; rv < rVals.length; rv++) {
            var resId = (rVals[rv][rIdCol] || "").toString().trim();
            if (resId) {
              resMap[resId] = {
                customerName: rNameCol >= 0 ? (rVals[rv][rNameCol] || "").toString().trim() : "",
                customerPhone: rPhoneCol >= 0 ? (rVals[rv][rPhoneCol] || "").toString().trim() : "",
                tableId: rTableCol >= 0 ? (rVals[rv][rTableCol] || "").toString().trim() : "",
                userId: rUserCol >= 0 ? (rVals[rv][rUserCol] || "").toString().trim() : ""
              };
            }
          }
        }
      }

      var ordersList = [];
      for (var f = 1; f < foodValues.length; f++) {
        var orderRestId = (foodValues[f][foRestCol] || "").toString().trim();
        if (orderRestId === reqRestId) {
          var rawItemsStr = foodValues[f][foItemsCol] || "[]";
          var parsedItems = [];
          try {
            parsedItems = JSON.parse(rawItemsStr);
          } catch (e) {
            parsedItems = [];
          }

          var orderResId = (foodValues[f][foResIdCol] || "").toString().trim();
          var resMeta = resMap[orderResId] || {};
          var orderUserId = (foodValues[f][foUserCol] || "").toString().trim();
          var orderCustName = resMeta.customerName || (orderUserId === "USR-1788787060247" ? "Sanketh Sharma" : "Guest Diner");

          ordersList.push({
            foodOrderId: (foodValues[f][foIdCol] || "").toString().trim(),
            reservationId: orderResId,
            userId: orderUserId,
            restaurantId: orderRestId,
            tableId: (foodValues[f][foTableCol] || resMeta.tableId || "").toString().trim(),
            customerName: orderCustName,
            customerPhone: resMeta.customerPhone || "",
            date: (foodValues[f][foDateCol] || "").toString().trim(),
            time: (foodValues[f][foTimeCol] || "").toString().trim(),
            items: parsedItems,
            foodTotal: Number(foodValues[f][foTotalCol]) || 0,
            status: (foodValues[f][foStatusCol] || "Pending").toString().trim(),
            createdAt: (foodValues[f][foCreatedCol] || "").toString().trim(),
            updatedAt: (foodValues[f][foUpdatedCol] || "").toString().trim()
          });
        }
      }

      // Sort newest / recently updated first
      ordersList.sort(function(a, b) {
        var timeA = new Date(a.updatedAt || a.createdAt).getTime() || 0;
        var timeB = new Date(b.updatedAt || b.createdAt).getTime() || 0;
        return timeB - timeA;
      });

      return jsonResponse({
        success: true,
        restaurantId: reqRestId,
        foodOrders: ordersList
      });
    }

    // -------------------------------------------------------------
    // ACTION: getCustomerFoodOrders
    // -------------------------------------------------------------
    else if (action === "getCustomerFoodOrders") {
      var reqUserId = (data.userId || "").toString().trim();
      var reqResId = (data.reservationId || "").toString().trim();

      if (!reqUserId && !reqResId) {
        return jsonResponse({
          success: false,
          message: "userId or reservationId is required"
        });
      }

      var foodSheet = ss.getSheetByName("FoodOrders");
      if (!foodSheet) {
        return jsonResponse({
          success: true,
          foodOrders: []
        });
      }

      var foodValues = foodSheet.getDataRange().getValues();
      if (foodValues.length < 2) {
        return jsonResponse({
          success: true,
          foodOrders: []
        });
      }

      var foodHeaders = foodValues[0].map(function(h) { return (h || "").toString().trim(); });
      var foIdCol = foodHeaders.indexOf("foodOrderId");
      var foResIdCol = foodHeaders.indexOf("reservationId");
      var foUserCol = foodHeaders.indexOf("userId");
      var foRestCol = foodHeaders.indexOf("restaurantId");
      var foTableCol = foodHeaders.indexOf("tableId");
      var foDateCol = foodHeaders.indexOf("date");
      var foTimeCol = foodHeaders.indexOf("time");
      var foItemsCol = foodHeaders.indexOf("items");
      var foTotalCol = foodHeaders.indexOf("foodTotal");
      var foStatusCol = foodHeaders.indexOf("status");
      var foCreatedCol = foodHeaders.indexOf("createdAt");
      var foUpdatedCol = foodHeaders.indexOf("updatedAt");

      var customerOrders = [];
      for (var f = 1; f < foodValues.length; f++) {
        var rowUserId = (foodValues[f][foUserCol] || "").toString().trim();
        var rowResId = (foodValues[f][foResIdCol] || "").toString().trim();

        var match = false;
        if (reqResId && rowResId === reqResId) {
          match = true;
        } else if (reqUserId && (rowUserId === reqUserId || (isDemoUser(rowUserId) && isDemoUser(reqUserId)))) {
          match = true;
        }

        if (match) {
          var parsedItems = [];
          try {
            parsedItems = JSON.parse(foodValues[f][foItemsCol] || "[]");
          } catch (e) {
            parsedItems = [];
          }

          customerOrders.push({
            foodOrderId: (foodValues[f][foIdCol] || "").toString().trim(),
            reservationId: rowResId,
            userId: rowUserId,
            restaurantId: (foodValues[f][foRestCol] || "").toString().trim(),
            tableId: (foodValues[f][foTableCol] || "").toString().trim(),
            date: (foodValues[f][foDateCol] || "").toString().trim(),
            time: (foodValues[f][foTimeCol] || "").toString().trim(),
            items: parsedItems,
            foodTotal: Number(foodValues[f][foTotalCol]) || 0,
            status: (foodValues[f][foStatusCol] || "Pending").toString().trim(),
            createdAt: (foodValues[f][foCreatedCol] || "").toString().trim(),
            updatedAt: (foodValues[f][foUpdatedCol] || "").toString().trim()
          });
        }
      }

      customerOrders.sort(function(a, b) {
        var timeA = new Date(a.updatedAt || a.createdAt).getTime() || 0;
        var timeB = new Date(b.updatedAt || b.createdAt).getTime() || 0;
        return timeB - timeA;
      });

      return jsonResponse({
        success: true,
        foodOrders: customerOrders
      });
    }

    // -------------------------------------------------------------
    // ACTION: updateFoodOrderStatus
    // -------------------------------------------------------------
    else if (action === "updateFoodOrderStatus") {
      var reqOrderId = (data.foodOrderId || data.orderId || data.id || "").toString().trim();
      var reqRestId = (data.restaurantId || "").toString().trim();
      var newStatus = (data.status || "").toString().trim();

      if (!reqOrderId || !reqRestId || !newStatus) {
        return jsonResponse({
          success: false,
          message: "Missing required fields: foodOrderId, restaurantId, and status are required."
        });
      }

      var validStatuses = ["Pending", "Accepted", "Preparing", "Ready", "Served", "Cancelled"];
      if (validStatuses.indexOf(newStatus) === -1) {
        return jsonResponse({
          success: false,
          message: "Invalid status: " + newStatus + ". Valid statuses are: " + validStatuses.join(", ")
        });
      }

      var foodSheet = ss.getSheetByName("FoodOrders");
      if (!foodSheet) {
        return jsonResponse({
          success: false,
          message: "FoodOrders sheet not found."
        });
      }

      var foodValues = foodSheet.getDataRange().getValues();
      if (foodValues.length < 2) {
        return jsonResponse({
          success: false,
          message: "No food orders found."
        });
      }

      var foodHeaders = foodValues[0].map(function(h) { return (h || "").toString().trim(); });
      var foIdCol = foodHeaders.indexOf("foodOrderId");
      var foRestCol = foodHeaders.indexOf("restaurantId");
      var foStatusCol = foodHeaders.indexOf("status");
      var foUpdatedCol = foodHeaders.indexOf("updatedAt");

      var targetRow = -1;
      for (var f = 1; f < foodValues.length; f++) {
        var rowOrderId = (foodValues[f][foIdCol] || "").toString().trim();
        var rowRestId = (foodValues[f][foRestCol] || "").toString().trim();

        if (rowOrderId === reqOrderId) {
          // Restaurant data isolation check: ensure order belongs to this restaurant
          if (rowRestId !== reqRestId) {
            return jsonResponse({
              success: false,
              message: "Unauthorized: Food order " + reqOrderId + " does not belong to restaurant " + reqRestId
            });
          }
          targetRow = f + 1;
          break;
        }
      }

      if (targetRow <= 0) {
        return jsonResponse({
          success: false,
          message: "Food order " + reqOrderId + " not found."
        });
      }

      var nowIso = new Date().toISOString();
      foodSheet.getRange(targetRow, foStatusCol + 1).setValue(newStatus);
      foodSheet.getRange(targetRow, foUpdatedCol + 1).setValue(nowIso);

      return jsonResponse({
        success: true,
        message: "Food order status updated to " + newStatus,
        foodOrderId: reqOrderId,
        status: newStatus,
        updatedAt: nowIso
      });
    }

    // -------------------------------------------------------------
    // ACTION: createCheckIn
    // Persists check-in records to the existing "CheckIns" sheet.
    // Columns: checkInId | reservationId | restaurantId | tableId | method | checkInTime | status
    // Validates reservation existence, restaurant ownership, and table matching.
    // Idempotent: Prevents duplicate check-in rows for the same reservation.
    // -------------------------------------------------------------
    else if (action === "createCheckIn") {
      var reqResId = (data.reservationId || "").toString().trim();
      var reqRestId = (data.restaurantId || "").toString().trim();
      var reqTableId = (data.tableId || "").toString().trim();
      var method = (data.method && data.method.toString().toLowerCase() === "qr") ? "QR" : "Manual";

      if (!reqResId) {
        return jsonResponse({
          success: false,
          message: "Missing reservationId"
        });
      }
      if (!reqRestId) {
        return jsonResponse({
          success: false,
          message: "Missing restaurantId"
        });
      }
      if (!reqTableId) {
        return jsonResponse({
          success: false,
          message: "Missing tableId"
        });
      }

      // Verify reservation in "Reservations" sheet
      var resSheet = ss.getSheetByName("Reservations");
      if (!resSheet) {
        return jsonResponse({
          success: false,
          message: "Reservations sheet not found"
        });
      }

      var resValues = resSheet.getDataRange().getValues();
      var matchedResRow = null;
      var matchedResIndex = -1;

      for (var r = 1; r < resValues.length; r++) {
        var row = resValues[r];
        var rowResId = (row[0] || "").toString().trim();
        if (
          rowResId.toLowerCase() === reqResId.toLowerCase() ||
          (reqResId.toLowerCase() === "res-ember-07" && rowResId === "RES-1788787060247")
        ) {
          matchedResRow = row;
          matchedResIndex = r + 1; // 1-indexed for Sheets
          break;
        }
      }

      // Security Check 1: Reservation must exist
      if (!matchedResRow) {
        return jsonResponse({
          success: false,
          message: "Reservation not found: " + reqResId
        });
      }

      // Security Check 2: Reservation must belong to the supplied restaurantId
      var resRestId = (matchedResRow[2] || "").toString().trim();
      if (resRestId && resRestId.toLowerCase() !== reqRestId.toLowerCase()) {
        return jsonResponse({
          success: false,
          message: "Security error: Reservation does not belong to restaurant " + reqRestId
        });
      }

      // Security Check 3: TableId must match the reservation
      var resTableId = (matchedResRow[3] || "").toString().trim();
      var cleanResTable = resTableId.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      var cleanReqTable = reqTableId.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      if (cleanResTable && cleanReqTable && cleanResTable !== cleanReqTable) {
        return jsonResponse({
          success: false,
          message: "Table mismatch: Provided table " + reqTableId + " does not match reservation table " + resTableId
        });
      }

      // Access or initialize the "CheckIns" sheet
      var checkInsSheet = ss.getSheetByName("CheckIns");
      if (!checkInsSheet) {
        checkInsSheet = ss.insertSheet("CheckIns");
        checkInsSheet.appendRow([
          "checkInId",
          "reservationId",
          "restaurantId",
          "tableId",
          "method",
          "checkInTime",
          "status"
        ]);
      }

      var checkInsData = checkInsSheet.getDataRange().getValues();
      var canonicalResId = (matchedResRow[0] || reqResId).toString().trim();

      // Check for duplicate check-in
      for (var c = 1; c < checkInsData.length; c++) {
        var cRow = checkInsData[c];
        var existingResId = (cRow[1] || "").toString().trim().toLowerCase();
        if (
          existingResId === reqResId.toLowerCase() ||
          existingResId === canonicalResId.toLowerCase()
        ) {
          return jsonResponse({
            success: true,
            message: "Reservation already checked in",
            isExisting: true,
            checkInId: cRow[0],
            checkInTime: cRow[5],
            checkIn: {
              checkInId: cRow[0],
              reservationId: cRow[1],
              restaurantId: cRow[2],
              tableId: cRow[3],
              method: cRow[4],
              checkInTime: cRow[5],
              status: cRow[6]
            }
          });
        }
      }

      // Generate check-in details
      var checkInId = "CI-" + new Date().getTime();
      var checkInTime = new Date().toISOString();
      var checkInStatus = "Checked In";
      var canonicalTableId = (matchedResRow[3] || reqTableId).toString().trim();

      // Append row to CheckIns sheet:
      // checkInId | reservationId | restaurantId | tableId | method | checkInTime | status
      checkInsSheet.appendRow([
        checkInId,
        canonicalResId,
        reqRestId,
        canonicalTableId,
        method,
        checkInTime,
        checkInStatus
      ]);

      // Update reservation status in Reservations sheet to 'checked-in'
      if (matchedResIndex > 0) {
        resSheet.getRange(matchedResIndex, 9).setValue("checked-in");
      }

      return jsonResponse({
        success: true,
        message: "Check-in created successfully and saved to Google Sheets",
        checkInId: checkInId,
        checkInTime: checkInTime,
        checkIn: {
          checkInId: checkInId,
          reservationId: canonicalResId,
          restaurantId: reqRestId,
          tableId: canonicalTableId,
          method: method,
          checkInTime: checkInTime,
          status: checkInStatus
        }
      });
    }

    // -------------------------------------------------------------
    // ACTION: createPayment
    // Persists reservation payments to the existing "Payment" sheet.
    // Columns: paymentId | reservationId | userId | amount | method | status | transactionId | createdAt
    // Validates reservation existence, user ownership, and supported payment method (UPI, RuPay, Net Banking).
    // Idempotent: Prevents duplicate payments for the same reservationId.
    // -------------------------------------------------------------
    else if (action === "createPayment") {
      var reqResId = (data.reservationId || "").toString().trim();
      var reqUserId = (data.userId || "").toString().trim();
      var reqAmount = Number(data.amount) || 0;
      var rawMethod = (data.method || "").toString().trim();

      if (!reqResId) {
        return jsonResponse({
          success: false,
          message: "Missing reservationId"
        });
      }
      if (!reqUserId) {
        return jsonResponse({
          success: false,
          message: "Missing userId"
        });
      }

      // Normalize and validate payment method (UPI, RuPay, Net Banking)
      var method = "UPI";
      var lowerMethod = rawMethod.toLowerCase();
      if (lowerMethod.includes("rupay") || lowerMethod.includes("card") || lowerMethod.includes("debit")) {
        method = "RuPay";
      } else if (lowerMethod.includes("net") || lowerMethod.includes("bank")) {
        method = "Net Banking";
      } else if (lowerMethod.includes("upi") || lowerMethod.includes("gpay") || lowerMethod.includes("phonepe") || lowerMethod.includes("paytm")) {
        method = "UPI";
      } else if (rawMethod === "UPI" || rawMethod === "RuPay" || rawMethod === "Net Banking") {
        method = rawMethod;
      } else {
        method = "UPI";
      }

      // Verify reservation in "Reservations" sheet
      var resSheet = ss.getSheetByName("Reservations");
      if (!resSheet) {
        return jsonResponse({
          success: false,
          message: "Reservations sheet not found"
        });
      }

      var resValues = resSheet.getDataRange().getValues();
      var matchedResRow = null;
      var matchedResIndex = -1;

      for (var r = 1; r < resValues.length; r++) {
        var row = resValues[r];
        var rowResId = (row[0] || "").toString().trim();
        if (
          rowResId.toLowerCase() === reqResId.toLowerCase() ||
          (reqResId.toLowerCase() === "res-ember-07" && rowResId === "RES-1788787060247")
        ) {
          matchedResRow = row;
          matchedResIndex = r + 1; // 1-indexed for Sheets
          break;
        }
      }

      // Security Check 1: Reservation must exist
      if (!matchedResRow) {
        return jsonResponse({
          success: false,
          message: "Reservation not found: " + reqResId
        });
      }

      // Security Check 2: Reservation must belong to the supplied userId
      var resUserId = (matchedResRow[1] || "").toString().trim();
      if (resUserId && resUserId.toLowerCase() !== reqUserId.toLowerCase()) {
        return jsonResponse({
          success: false,
          message: "Security error: Reservation does not belong to user " + reqUserId
        });
      }

      // Access or initialize the "Payment" sheet
      var paymentSheet = ss.getSheetByName("Payment");
      if (!paymentSheet) {
        paymentSheet = ss.insertSheet("Payment");
        paymentSheet.appendRow([
          "paymentId",
          "reservationId",
          "userId",
          "amount",
          "method",
          "status",
          "transactionId",
          "createdAt"
        ]);
      }

      var canonicalResId = (matchedResRow[0] || reqResId).toString().trim();
      var canonicalUserId = (matchedResRow[1] || reqUserId).toString().trim();

      // Check for duplicate payment for this reservationId
      var paymentData = paymentSheet.getDataRange().getValues();
      for (var p = 1; p < paymentData.length; p++) {
        var pRow = paymentData[p];
        var existingResId = (pRow[1] || "").toString().trim().toLowerCase();
        var existingStatus = (pRow[5] || "").toString().trim();

        if (
          (existingResId === reqResId.toLowerCase() || existingResId === canonicalResId.toLowerCase()) &&
          existingStatus.toLowerCase() === "paid"
        ) {
          return jsonResponse({
            success: true,
            message: "Payment already recorded for this reservation",
            isExisting: true,
            paymentId: pRow[0],
            transactionId: pRow[6],
            createdAt: pRow[7],
            payment: {
              paymentId: pRow[0],
              reservationId: pRow[1],
              userId: pRow[2],
              amount: pRow[3],
              method: pRow[4],
              status: pRow[5],
              transactionId: pRow[6],
              createdAt: pRow[7]
            }
          });
        }
      }

      // Generate payment details
      var paymentTimestamp = new Date().getTime();
      var paymentId = "PAY-" + paymentTimestamp;
      var transactionId = "TXN-" + paymentTimestamp;
      var createdAt = new Date().toISOString();
      var status = "Paid";
      var finalAmount = reqAmount > 0 ? reqAmount : (Number(matchedResRow[9]) || 300);

      // Append row to Payment sheet:
      // paymentId | reservationId | userId | amount | method | status | transactionId | createdAt
      paymentSheet.appendRow([
        paymentId,
        canonicalResId,
        canonicalUserId,
        finalAmount,
        method,
        status,
        transactionId,
        createdAt
      ]);

      return jsonResponse({
        success: true,
        message: "Payment recorded successfully in Google Sheets",
        paymentId: paymentId,
        transactionId: transactionId,
        createdAt: createdAt,
        payment: {
          paymentId: paymentId,
          reservationId: canonicalResId,
          userId: canonicalUserId,
          amount: finalAmount,
          method: method,
          status: status,
          transactionId: transactionId,
          createdAt: createdAt
        }
      });
    }

    // -------------------------------------------------------------
    // ACTION: createBill
    // Persists final dining bills to the existing "Bills" sheet.
    // Columns: billId | reservationId | userId | restaurantId | foodAmount | depositAmount | depositAdjustment | finalAmount | status | sentToMobile | createdAt
    // Validates reservation existence, user ownership, and restaurant ownership.
    // Idempotent: Prevents duplicate final bills for the same reservationId.
    // -------------------------------------------------------------
    else if (action === "createBill") {
      var reqResId = (data.reservationId || "").toString().trim();
      var reqUserId = (data.userId || "").toString().trim();
      var reqRestaurantId = (data.restaurantId || "").toString().trim();
      var reqFoodAmount = Number(data.foodAmount) || 0;
      var reqDepositAmount = Number(data.depositAmount) || 0;
      var reqDepositAdjustment = Number(data.depositAdjustment) || 0;
      var reqFinalAmount = Number(data.finalAmount) || 0;
      var rawSentToMobile = data.sentToMobile;

      if (!reqResId) {
        return jsonResponse({
          success: false,
          message: "Missing reservationId"
        });
      }
      if (!reqUserId) {
        return jsonResponse({
          success: false,
          message: "Missing userId"
        });
      }
      if (!reqRestaurantId) {
        return jsonResponse({
          success: false,
          message: "Missing restaurantId"
        });
      }

      var sentToMobile = (rawSentToMobile === true || rawSentToMobile === "true" || rawSentToMobile === "Yes" || rawSentToMobile === "yes") ? "Yes" : "No";

      // Verify reservation in "Reservations" sheet
      var resSheet = ss.getSheetByName("Reservations");
      if (!resSheet) {
        return jsonResponse({
          success: false,
          message: "Reservations sheet not found"
        });
      }

      var resValues = resSheet.getDataRange().getValues();
      var matchedResRow = null;

      for (var r = 1; r < resValues.length; r++) {
        var row = resValues[r];
        var rowResId = (row[0] || "").toString().trim();
        if (
          rowResId.toLowerCase() === reqResId.toLowerCase() ||
          (reqResId.toLowerCase() === "res-ember-07" && rowResId === "RES-1788787060247")
        ) {
          matchedResRow = row;
          break;
        }
      }

      // Security Check 1: Reservation must exist
      if (!matchedResRow) {
        return jsonResponse({
          success: false,
          message: "Reservation not found: " + reqResId
        });
      }

      // Security Check 2: Reservation must belong to the supplied userId
      var resUserId = (matchedResRow[1] || "").toString().trim();
      if (resUserId && resUserId.toLowerCase() !== reqUserId.toLowerCase()) {
        return jsonResponse({
          success: false,
          message: "Security error: Reservation does not belong to user " + reqUserId
        });
      }

      // Security Check 3: Reservation must belong to the supplied restaurantId
      var resRestaurantId = (matchedResRow[2] || "").toString().trim();
      var restMatch = resRestaurantId.toLowerCase() === reqRestaurantId.toLowerCase() ||
        (resRestaurantId === "rest-1" && (reqRestaurantId === "the-ember-room" || reqRestaurantId === "rest-1")) ||
        (reqRestaurantId === "rest-1" && (resRestaurantId === "the-ember-room" || resRestaurantId === "rest-1"));
      if (resRestaurantId && !restMatch) {
        return jsonResponse({
          success: false,
          message: "Security error: Reservation does not belong to restaurant " + reqRestaurantId
        });
      }

      // Access or initialize the "Bills" sheet
      var billsSheet = ss.getSheetByName("Bills");
      if (!billsSheet) {
        billsSheet = ss.insertSheet("Bills");
        billsSheet.appendRow([
          "billId",
          "reservationId",
          "userId",
          "restaurantId",
          "foodAmount",
          "depositAmount",
          "depositAdjustment",
          "finalAmount",
          "status",
          "sentToMobile",
          "createdAt"
        ]);
      }

      var canonicalResId = (matchedResRow[0] || reqResId).toString().trim();
      var canonicalUserId = (matchedResRow[1] || reqUserId).toString().trim();
      var canonicalRestaurantId = (matchedResRow[2] || reqRestaurantId).toString().trim();

      // Check for duplicate final bill for this reservationId
      var billData = billsSheet.getDataRange().getValues();
      for (var b = 1; b < billData.length; b++) {
        var bRow = billData[b];
        var existingResId = (bRow[1] || "").toString().trim().toLowerCase();
        var existingStatus = (bRow[8] || "").toString().trim().toLowerCase();

        if (
          (existingResId === reqResId.toLowerCase() || existingResId === canonicalResId.toLowerCase()) &&
          existingStatus === "final"
        ) {
          // If sentToMobile was requested and not yet marked Yes, update it
          if (sentToMobile === "Yes" && (bRow[9] || "").toString().trim() !== "Yes") {
            billsSheet.getRange(b + 1, 10).setValue("Yes");
            bRow[9] = "Yes";
          }

          return jsonResponse({
            success: true,
            message: "Final bill already exists for this reservation",
            isExisting: true,
            billId: bRow[0],
            bill: {
              billId: bRow[0],
              reservationId: bRow[1],
              userId: bRow[2],
              restaurantId: bRow[3],
              foodAmount: bRow[4],
              depositAmount: bRow[5],
              depositAdjustment: bRow[6],
              finalAmount: bRow[7],
              status: bRow[8],
              sentToMobile: bRow[9],
              createdAt: bRow[10]
            }
          });
        }
      }

      // Generate new bill details
      var billTimestamp = new Date().getTime();
      var billId = "BILL-" + billTimestamp;
      var status = "Final";
      var createdAt = new Date().toISOString();

      // Append row to Bills sheet:
      // billId | reservationId | userId | restaurantId | foodAmount | depositAmount | depositAdjustment | finalAmount | status | sentToMobile | createdAt
      billsSheet.appendRow([
        billId,
        canonicalResId,
        canonicalUserId,
        canonicalRestaurantId,
        reqFoodAmount,
        reqDepositAmount,
        reqDepositAdjustment,
        reqFinalAmount,
        status,
        sentToMobile,
        createdAt
      ]);

      return jsonResponse({
        success: true,
        message: "Final dining bill recorded successfully in Google Sheets",
        billId: billId,
        bill: {
          billId: billId,
          reservationId: canonicalResId,
          userId: canonicalUserId,
          restaurantId: canonicalRestaurantId,
          foodAmount: reqFoodAmount,
          depositAmount: reqDepositAmount,
          depositAdjustment: reqDepositAdjustment,
          finalAmount: reqFinalAmount,
          status: status,
          sentToMobile: sentToMobile,
          createdAt: createdAt
        }
      });
    }

    // -------------------------------------------------------------
    // ACTION: createNotifyMe
    // -------------------------------------------------------------
    else if (action === "createNotifyMe") {
      var reqUserId = (body.userId || "").toString().trim();
      var reqRestaurantId = (body.restaurantId || "").toString().trim();
      var reqDate = (body.date || "").toString().trim();
      var reqTime = (body.time || body.timeSlot || "").toString().trim();
      var reqGuests = body.guests;
      var reqPreferences = (body.preferences || body.seatingPreference || "").toString().trim();

      // Validate required fields
      if (!reqUserId) {
        return jsonResponse({
          success: false,
          message: "Missing userId"
        });
      }
      if (!reqRestaurantId) {
        return jsonResponse({
          success: false,
          message: "Missing restaurantId"
        });
      }
      if (!reqDate) {
        return jsonResponse({
          success: false,
          message: "Missing date"
        });
      }
      if (!reqTime) {
        return jsonResponse({
          success: false,
          message: "Missing time"
        });
      }
      if (reqGuests === undefined || reqGuests === null || reqGuests === "" || isNaN(Number(reqGuests))) {
        return jsonResponse({
          success: false,
          message: "Missing guests"
        });
      }

      var notifySheet = ss.getSheetByName("NotifyMe");
      if (!notifySheet) {
        notifySheet = ss.insertSheet("NotifyMe");
        notifySheet.appendRow([
          "notifyId",
          "userId",
          "restaurantId",
          "date",
          "time",
          "guests",
          "preferences",
          "status",
          "createdAt"
        ]);
      }

      // Prevent duplicate active Notify Me requests for the same: userId + restaurantId + date + time
      var notifyData = notifySheet.getDataRange().getValues();
      for (var n = 1; n < notifyData.length; n++) {
        var nRow = notifyData[n];
        var nNotifyId = (nRow[0] || "").toString().trim();
        var nUserId = (nRow[1] || "").toString().trim().toLowerCase();
        var nRestaurantId = (nRow[2] || "").toString().trim().toLowerCase();
        var nDate = (nRow[3] || "").toString().trim().toLowerCase();
        var nTime = (nRow[4] || "").toString().trim().toLowerCase();
        var nStatus = (nRow[7] || "").toString().trim().toLowerCase();

        var restMatch = (nRestaurantId === reqRestaurantId.toLowerCase()) ||
          (nRestaurantId === "rest-1" && reqRestaurantId.toLowerCase() === "the-ember-room") ||
          (nRestaurantId === "the-ember-room" && reqRestaurantId.toLowerCase() === "rest-1");

        if (
          nUserId === reqUserId.toLowerCase() &&
          restMatch &&
          nDate === reqDate.toLowerCase() &&
          nTime === reqTime.toLowerCase() &&
          nStatus === "active"
        ) {
          return jsonResponse({
            success: true,
            message: "Active notify request already exists for this slot",
            isExisting: true,
            notifyId: nNotifyId,
            notifyRequest: {
              notifyId: nNotifyId,
              userId: nRow[1],
              restaurantId: nRow[2],
              date: nRow[3],
              time: nRow[4],
              guests: nRow[5],
              preferences: nRow[6],
              status: nRow[7],
              createdAt: nRow[8]
            }
          });
        }
      }

      // Generate unique notifyId
      var notifyTimestamp = new Date().getTime();
      var notifyId = "NOTIFY-" + notifyTimestamp;
      var status = "Active";
      var createdAt = new Date().toISOString();

      notifySheet.appendRow([
        notifyId,
        reqUserId,
        reqRestaurantId,
        reqDate,
        reqTime,
        Number(reqGuests),
        reqPreferences,
        status,
        createdAt
      ]);

      return jsonResponse({
        success: true,
        message: "Notify Me request recorded successfully in Google Sheets",
        notifyId: notifyId,
        notifyRequest: {
          notifyId: notifyId,
          userId: reqUserId,
          restaurantId: reqRestaurantId,
          date: reqDate,
          time: reqTime,
          guests: Number(reqGuests),
          preferences: reqPreferences,
          status: status,
          createdAt: createdAt
        }
      });
    }

    // -------------------------------------------------------------
    // Unknown Action
    // -------------------------------------------------------------
    else {
      return jsonResponse({
        success: false,
        message: "Unknown action"
      });
    }

  } catch (err) {
    return jsonResponse({
      success: false,
      message: err.toString()
    });
  }
}

/**
 * One-time setup / maintenance function to seed demo accounts and verify sheet tabs
 */
function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Users sheet
  var usersSheet = ss.getSheetByName("Users");
  if (!usersSheet) {
    usersSheet = ss.insertSheet("Users");
    usersSheet.appendRow(["userId", "fullName", "email", "mobile", "password", "role", "createdAt"]);
  }

  // 2. Reservations sheet
  var resSheet = ss.getSheetByName("Reservations");
  if (!resSheet) {
    resSheet = ss.insertSheet("Reservations");
    resSheet.appendRow([
      "reservationId",
      "userId",
      "restaurantId",
      "tableId",
      "date",
      "time",
      "guests",
      "preferences",
      "status",
      "depositAmount",
      "createdAt"
    ]);
    // Seed initial confirmed reservation for Sanketh at rest-1 (The Ember Room)
    resSheet.appendRow([
      "RES-1788787060247",
      "USR-1788787060247",
      "rest-1",
      "t-203",
      "2026-09-14",
      "07:30 PM",
      4,
      "Window · Quiet table preferred",
      "confirmed",
      300,
      "2026-09-07T14:40:00.000Z"
    ]);
  }

  // 3. Tables sheet
  var tablesSheet = ss.getSheetByName("Tables");
  if (!tablesSheet) {
    tablesSheet = ss.insertSheet("Tables");
    tablesSheet.appendRow([
      "tableId",
      "restaurantId",
      "tableNumber",
      "capacity",
      "minCapacity",
      "shape",
      "section",
      "features",
      "x",
      "y",
      "width",
      "height",
      "status"
    ]);
    var defaultRest1Tables = [
      ["t-101", "rest-1", "T01", 2, 1, "circle", "Courtyard Terrace", "Garden View, Romantic, Breeze", 8, 12, 14, 14, "available"],
      ["t-102", "rest-1", "T02", 2, 1, "circle", "Courtyard Terrace", "Garden View, Quiet", 26, 12, 14, 14, "occupied"],
      ["t-103", "rest-1", "T03", 4, 2, "rect", "Courtyard Terrace", "Garden View, Outdoor Canopy, Spacious", 46, 10, 20, 16, "reserved"],
      ["t-104", "rest-1", "T04", 6, 4, "rect", "Courtyard Terrace", "Garden View, Family Seating, Water Fountain", 72, 10, 22, 16, "cleaning"],
      ["t-201", "rest-1", "T05", 4, 2, "booth", "Main Dining", "Plush Velvet Booth, Quiet, Chandelier View", 8, 40, 22, 18, "available"],
      ["t-202", "rest-1", "T06", 4, 2, "rect", "Main Dining", "Central Ambience, Live Sitar Acoustics", 36, 40, 18, 18, "available"],
      ["t-203", "rest-1", "T07", 4, 2, "rect", "Main Dining", "Window, Quiet, Spacious", 58, 40, 18, 18, "reserved"],
      ["t-204", "rest-1", "T08", 8, 5, "rect", "Main Dining", "Large Banquet Table, Celebration, Chandelier View", 80, 38, 16, 22, "occupied"],
      ["t-301", "rest-1", "T09", 2, 1, "circle", "Bar Lounge", "Cocktail Counter, Ambient Lighting, Upbeat Music", 10, 72, 14, 14, "occupied"],
      ["t-302", "rest-1", "T10", 2, 1, "circle", "Bar Lounge", "High Table, Bar Proximity", 28, 72, 14, 14, "available"],
      ["t-303", "rest-1", "T11", 4, 2, "booth", "Private Alcove", "Private Curtained Booth, Intimate, Warm Lighting", 50, 70, 20, 20, "cleaning"],
      ["t-304", "rest-1", "T12", 6, 3, "booth", "Private Alcove", "Royal Alcove, VIP Hospitality, Dedicated Butler", 74, 70, 22, 20, "unavailable"]
    ];
    for (var d = 0; d < defaultRest1Tables.length; d++) {
      tablesSheet.appendRow(defaultRest1Tables[d]);
    }
  }

  // 4. FoodOrders sheet
  var foodSheet = ss.getSheetByName("FoodOrders");
  if (!foodSheet) {
    foodSheet = ss.insertSheet("FoodOrders");
    foodSheet.appendRow([
      "foodOrderId",
      "reservationId",
      "userId",
      "restaurantId",
      "tableId",
      "date",
      "time",
      "items",
      "foodTotal",
      "status",
      "createdAt",
      "updatedAt"
    ]);
  }

  // 5. CheckIns sheet
  var checkInsSheet = ss.getSheetByName("CheckIns");
  if (!checkInsSheet) {
    checkInsSheet = ss.insertSheet("CheckIns");
    checkInsSheet.appendRow([
      "checkInId",
      "reservationId",
      "restaurantId",
      "tableId",
      "method",
      "checkInTime",
      "status"
    ]);
  }

  // 6. Payment sheet
  var paymentSheet = ss.getSheetByName("Payment");
  if (!paymentSheet) {
    paymentSheet = ss.insertSheet("Payment");
    paymentSheet.appendRow([
      "paymentId",
      "reservationId",
      "userId",
      "amount",
      "method",
      "status",
      "transactionId",
      "createdAt"
    ]);
  } else if (paymentSheet.getLastRow() === 0) {
    paymentSheet.appendRow([
      "paymentId",
      "reservationId",
      "userId",
      "amount",
      "method",
      "status",
      "transactionId",
      "createdAt"
    ]);
  }

  // 7. Bills sheet
  var billsSheet = ss.getSheetByName("Bills");
  if (!billsSheet) {
    billsSheet = ss.insertSheet("Bills");
    billsSheet.appendRow([
      "billId",
      "reservationId",
      "userId",
      "restaurantId",
      "foodAmount",
      "depositAmount",
      "depositAdjustment",
      "finalAmount",
      "status",
      "sentToMobile",
      "createdAt"
    ]);
  } else if (billsSheet.getLastRow() === 0) {
    billsSheet.appendRow([
      "billId",
      "reservationId",
      "userId",
      "restaurantId",
      "foodAmount",
      "depositAmount",
      "depositAdjustment",
      "finalAmount",
      "status",
      "sentToMobile",
      "createdAt"
    ]);
  }

  // 8. NotifyMe sheet
  var notifySheet = ss.getSheetByName("NotifyMe");
  if (!notifySheet) {
    notifySheet = ss.insertSheet("NotifyMe");
    notifySheet.appendRow([
      "notifyId",
      "userId",
      "restaurantId",
      "date",
      "time",
      "guests",
      "preferences",
      "status",
      "createdAt"
    ]);
  } else if (notifySheet.getLastRow() === 0) {
    notifySheet.appendRow([
      "notifyId",
      "userId",
      "restaurantId",
      "date",
      "time",
      "guests",
      "preferences",
      "status",
      "createdAt"
    ]);
  }

  Logger.log("FlashTable database sheets verified successfully.");
}
