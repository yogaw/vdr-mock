/* ============================================================
   SecureVDR mock — seed data + localStorage bootstrap
   Version-gated: bump MOCK_VERSION to force a reseed.
   Storage: 'vdr.db' holds the whole DB; 'vdr.session' the session.
   ============================================================ */

window.VDR = window.VDR || {};

VDR.MOCK_VERSION = 'it1-v5'; // bumped: PDFs now carry in-app HTML preview pages too

VDR.seed = function () {
  return {
    users: [
      { id: 'u-admin',   email: 'admin@vdr.test',   name: 'Nadia Putri', role: 'admin',  password: 'admin123',  status: 'active', mfa_enabled: false, created_at: '2026-08-01T09:00:00Z' },
      { id: 'u-viewer',  email: 'viewer@vdr.test',  name: 'Victor Chen',    role: 'viewer', password: 'viewer123', status: 'active', mfa_enabled: false, created_at: '2026-08-10T09:00:00Z' },
      { id: 'u-expired', email: 'expired@vdr.test', name: 'Evan Reed',      role: 'viewer', password: 'viewer123', status: 'active', mfa_enabled: false, created_at: '2026-08-10T09:00:00Z' },
      // Hidden account: used only by the smoke-test suite (revoked grant path).
      { id: 'u-revoked', email: 'revoked@vdr.test', name: 'Rita Voss',      role: 'viewer', password: 'viewer123', status: 'active', mfa_enabled: false, created_at: '2026-08-10T09:00:00Z' }
    ],

    rooms: [
      {
        id: 'room-aurora', name: 'Project Aurora', description: 'Acquisition due diligence — confidential.', status: 'active',
        default_download_allowed: false, watermark_enabled: true,
        wm_include_email: true, wm_include_name: true, wm_include_timestamp: true, wm_include_room_name: true,
        created_by: 'u-admin', created_at: '2026-08-28T09:20:00Z', deleted_at: null
      },
      {
        id: 'room-bolt', name: 'Project Bolt', description: 'Restructuring workspace — restricted distribution.', status: 'active',
        default_download_allowed: false, watermark_enabled: true,
        wm_include_email: true, wm_include_name: true, wm_include_timestamp: true, wm_include_room_name: true,
        created_by: 'u-admin', created_at: '2026-08-27T11:05:00Z', deleted_at: null
      }
    ],

    folders: [
      { id: 'f-aur-legal', room_id: 'room-aurora', parent_folder_id: null, name: '01 — Legal' },
      { id: 'f-aur-fin',   room_id: 'room-aurora', parent_folder_id: null, name: '02 — Financial' },
      { id: 'f-bolt-gen',  room_id: 'room-bolt',   parent_folder_id: null, name: 'General' }
    ],

    documents: [
      {
        id: 'd-aurora-nda', room_id: 'room-aurora', folder_id: 'f-aur-legal',
        name: 'NDA — Execution Copy.pdf', original_filename: 'nda-execution-copy.pdf',
        mime: 'application/pdf', type: 'pdf', size_bytes: 384000, pages: 5, version: 2,
        access_enabled: true, download_allowed: null, watermark_enabled: null,
        storage_key: 'rooms/room-aurora/f-aur-legal/d-aurora-nda/v2.pdf',
        file: 'assets/nda-execution-copy.pdf',
        // In-app HTML preview (plugin-free). The real PDF opens via "Open in new tab".
        preview: {
          kind: 'doc',
          title: 'Mutual Non-Disclosure Agreement — Execution Copy',
          subtitle: 'Project Aurora / 01 Legal',
          date: 'Effective as of August 28, 2026',
          blocks: [
            { type: 'h', text: '1. Parties' },
            { type: 'p', text: 'This Agreement is entered into by and between the disclosing and receiving parties identified in the signature blocks below, collectively the "Parties".' },
            { type: 'h', text: '2. Purpose' },
            { type: 'p', text: 'The Parties wish to exchange confidential information solely for the purpose of evaluating a potential transaction relating to Project Aurora (the "Purpose").' },
            { type: 'h', text: '3. Obligations' },
            { type: 'ul', items: [
              'Hold all confidential information in strict confidence',
              'Use the information only for the stated Purpose',
              'Restrict access to personnel with a need to know, bound by equivalent obligations',
              'Return or destroy confidential information on request'
            ] },
            { type: 'h', text: '4. Term' },
            { type: 'p', text: 'This Agreement remains in force for two (2) years from the effective date, after which obligations survive for a further three (3) years with respect to trade secrets.' },
            { type: 'h', text: '5. General provisions' },
            { type: 'p', text: 'Nothing in this Agreement grants any license or right in any intellectual property. This document is a mock seed artifact and is not a legal instrument.' },
            { type: 'sign', text: 'Executed by the Parties — mock seed document' }
          ]
        },
        uploaded_by: 'u-admin', created_at: '2026-08-28T10:00:00Z', updated_at: '2026-08-29T16:40:00Z', deleted_at: null
      },
      {
        id: 'd-aurora-fa', room_id: 'room-aurora', folder_id: 'f-aur-fin',
        name: 'Financial Statements 2025.pdf', original_filename: 'financial-statements-2025.pdf',
        mime: 'application/pdf', type: 'pdf', size_bytes: 512000, pages: 5, version: 1,
        access_enabled: true, download_allowed: null, watermark_enabled: null,
        storage_key: 'rooms/room-aurora/f-aur-fin/d-aurora-fa/v1.pdf',
        file: 'assets/financial-statements-2025.pdf',
        preview: {
          kind: 'doc',
          title: 'Financial Statements 2025',
          subtitle: 'Project Aurora / 02 Financial — Unaudited, illustrative',
          date: 'Fiscal year ended December 31, 2025',
          blocks: [
            { type: 'h', text: '1. Summary' },
            { type: 'ul', items: [
              'Revenue: IDR 148.2 billion (up 22.4% year over year)',
              'Cost of revenue: IDR 92.7 billion',
              'Gross profit: IDR 55.5 billion (37.5% margin)',
              'Operating expenses: IDR 38.1 billion',
              'EBITDA: IDR 19.9 billion (13.4% margin)'
            ] },
            { type: 'h', text: '2. Balance sheet highlights' },
            { type: 'ul', items: [
              'Total assets: IDR 210.4 billion',
              'Total liabilities: IDR 86.9 billion',
              'Shareholders equity: IDR 123.5 billion',
              'Cash and equivalents: IDR 41.2 billion'
            ] },
            { type: 'h', text: '3. Notes' },
            { type: 'p', text: 'Figures are presented for mock demonstration purposes only and do not represent any actual entity. All activity in this data room is logged.' }
          ]
        },
        uploaded_by: 'u-admin', created_at: '2026-08-28T10:12:00Z', updated_at: '2026-08-28T10:12:00Z', deleted_at: null
      },
      {
        id: 'd-aurora-cap', room_id: 'room-aurora', folder_id: 'f-aur-fin',
        name: 'Cap Table.xlsx', original_filename: 'cap-table.xlsx',
        mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', type: 'xlsx', size_bytes: 88320, pages: null, version: 1,
        access_enabled: true, download_allowed: null, watermark_enabled: null,
        storage_key: 'rooms/room-aurora/f-aur-fin/d-aurora-cap/v1.xlsx',
        file: 'assets/cap-table.xlsx',
        // Simulated conversion preview — the mock renders from seeded data, no real parsing.
        preview: {
          kind: 'sheet',
          sheetName: 'Cap Table',
          tabs: ['Cap Table', 'Option Detail', 'Notes'],
          columns: ['Investor', 'Share class', 'Shares', 'Price / share (USD)', 'Ownership'],
          colTypes: ['text', 'text', 'number', 'currency', 'percent'],
          rows: [
            ['Nusantara Growth Partners', 'Series A', 1250000, 1.20, 0.3125],
            ['Celebes Ventures', 'Series A', 900000, 1.20, 0.2250],
            ['Santika Angel Fund', 'Seed', 600000, 0.45, 0.15],
            ['Nadia Putri (Founder)', 'Common', 700000, 0.05, 0.175],
            ['Employee Option Pool', 'Common — reserved', 550000, null, 0.1375],
            ['TOTAL', '', 4000000, null, 1]
          ]
        },
        uploaded_by: 'u-admin', created_at: '2026-08-28T10:20:00Z', updated_at: '2026-08-28T10:20:00Z', deleted_at: null
      },
      {
        id: 'd-bolt-notes', room_id: 'room-bolt', folder_id: 'f-bolt-gen',
        name: 'Board Meeting Notes.docx', original_filename: 'board-meeting-notes.docx',
        mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', type: 'docx', size_bytes: 45312, pages: null, version: 1,
        access_enabled: true, download_allowed: null, watermark_enabled: null,
        storage_key: 'rooms/room-bolt/f-bolt-gen/d-bolt-notes/v1.docx',
        file: 'assets/board-meeting-notes.docx',
        preview: {
          kind: 'doc',
          title: 'Board Meeting Notes',
          subtitle: 'Project Bolt — Quarterly Board Meeting',
          date: 'August 21, 2026',
          blocks: [
            { type: 'h', text: '1. Attendance' },
            { type: 'ul', items: [
              'Nadia Putri — Chief Executive Officer',
              'Bram Sutanto — Independent Director',
              'Sari Wulandari — Chief Financial Officer',
              'Dedi Prasetyo — Legal Counsel'
            ] },
            { type: 'h', text: '2. Agenda' },
            { type: 'ul', items: [
              'Restructuring timeline and milestones',
              'Q3 financial position and runway',
              'Data room access governance for external advisors'
            ] },
            { type: 'h', text: '3. Key resolutions' },
            { type: 'p', text: 'The board approved the restructuring timeline presented by management, targeting completion before the end of Q4 2026. Management is authorized to engage external advisors under the approved budget.' },
            { type: 'p', text: 'Access to the Project Bolt data room will be limited to named individuals, time-boxed, and reviewed monthly by the CFO.' },
            { type: 'h', text: '4. Next steps' },
            { type: 'ul', items: [
              'CFO to circulate the advisor access list for approval',
              'Legal counsel to finalize the draft engagement letters',
              'Next board check-in scheduled for September 18, 2026'
            ] },
            { type: 'sign', text: 'Adopted and signed — August 21, 2026' }
          ]
        },
        uploaded_by: 'u-admin', created_at: '2026-08-27T11:30:00Z', updated_at: '2026-08-27T11:30:00Z', deleted_at: null
      }
    ],

    grants: [
      { id: 'g-viewer-aurora',  user_id: 'u-viewer',  room_id: 'room-aurora', granted_by: 'u-admin', granted_at: '2026-08-28T09:31:00Z', expires_at: '2026-09-30T23:59:59Z', revoked_at: null },
      { id: 'g-expired-aurora', user_id: 'u-expired', room_id: 'room-aurora', granted_by: 'u-admin', granted_at: '2026-07-15T09:00:00Z', expires_at: '2026-08-01T23:59:59Z', revoked_at: null },
      { id: 'g-revoked-aurora', user_id: 'u-revoked', room_id: 'room-aurora', granted_by: 'u-admin', granted_at: '2026-07-20T09:00:00Z', expires_at: '2026-10-31T23:59:59Z', revoked_at: '2026-08-10T14:00:00Z' }
    ],

    // Newest first.
    events: [
      { id: 'e-seed-5', user_id: 'u-viewer',  event_type: 'view',          room_id: 'room-aurora', document_id: 'd-aurora-fa',  ip: '203.0.113.24', user_agent: 'seed', detail: '', created_at: '2026-08-29T10:09:00Z' },
      { id: 'e-seed-4', user_id: 'u-viewer',  event_type: 'view',          room_id: 'room-aurora', document_id: 'd-aurora-nda', ip: '203.0.113.24', user_agent: 'seed', detail: '', created_at: '2026-08-29T10:02:00Z' },
      { id: 'e-seed-3', user_id: 'u-admin',   event_type: 'admin_action',  room_id: 'room-aurora', document_id: null,          ip: '203.0.113.10', user_agent: 'seed', detail: 'Granted Victor Chen access to Project Aurora (expires 2026-09-30)', created_at: '2026-08-28T09:31:00Z' },
      { id: 'e-seed-2', user_id: 'u-admin',   event_type: 'admin_action',  room_id: 'room-aurora', document_id: null,          ip: '203.0.113.10', user_agent: 'seed', detail: 'Created data room Project Aurora', created_at: '2026-08-28T09:20:00Z' },
      { id: 'e-seed-1', user_id: 'u-admin',   event_type: 'login',         room_id: null,          document_id: null,          ip: '203.0.113.10', user_agent: 'seed', detail: '', created_at: '2026-08-28T09:12:00Z' }
    ]
  };
};

(function bootstrap() {
  // A stored db is only usable if every document carries a real file AND
  // preview data. Anything older/partial self-heals by reseeding.
  function healthy(db) {
    return !!db && Array.isArray(db.users) && Array.isArray(db.documents) &&
      db.documents.length > 0 &&
      db.documents.every(function (d) {
        return !!d.file && !!d.preview;
      });
  }
  try {
    var raw = localStorage.getItem('vdr.db');
    var db = null;
    if (raw) { try { db = JSON.parse(raw); } catch (e) { db = null; } }
    if (!db || db.__version !== VDR.MOCK_VERSION || !healthy(db)) {
      var seeded = VDR.seed();
      seeded.__version = VDR.MOCK_VERSION;
      localStorage.setItem('vdr.db', JSON.stringify(seeded));
      console.info('[VDR mock] seeded demo data v' + VDR.MOCK_VERSION);
    }
  } catch (e) {
    console.warn('VDR mock: localStorage unavailable — cross-page state will not persist.', e);
  }
})();
