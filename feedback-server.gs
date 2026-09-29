/**
 * Trinkets Arcade anonymous feedback inbox.
 *
 * SETUP (once, ~5 minutes):
 * 1. Create a blank spreadsheet at sheets.google.com, name it "Trinkets Feedback".
 * 2. Put these headers in row 1: Timestamp | Game | Type | Subject | Details | Page
 * 3. In the spreadsheet: Extensions -> Apps Script.
 * 4. Delete any placeholder code, paste this whole file, press Save.
 * 5. Deploy -> New deployment -> gear icon -> Web app.
 *    - Description: feedback v1
 *    - Execute as: Me
 *    - Who has access: Anyone
 *    - Deploy, then authorize (choose account -> Advanced ->
 *      "Go to Trinkets Feedback (unsafe)" -> Allow).
 * 6. Copy the Web app URL (ends in /exec) into FEEDBACK_SHEET_URL
 *    at the top of feedback.js (or send it to your dev to wire in).
 * 7. Test it: send a report from feedback.html, watch the row appear.
 *
 * NOTE: editing this script later requires redeploying:
 * Deploy -> Manage deployments -> pencil icon -> Version: New version.
 */

function doPost(e) {
  var data = {};
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    data = {};
  }
  SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().appendRow([
    new Date(),
    data.game || "",
    data.type || "",
    data.subject || "",
    data.details || "",
    data.page || ""
  ]);
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(
    ContentService.MimeType.JSON
  );
}
