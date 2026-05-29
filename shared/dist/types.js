"use strict";
// ─────────────────────────────────────────────────────────────────────────────
// SEC EDGAR
// ─────────────────────────────────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPORTED_FORMS = void 0;
exports.isSupportedForm = isSupportedForm;
exports.SUPPORTED_FORMS = [
    // Earnings & operations
    '10-K', '10-K/A', '10-Q', '10-Q/A',
    '8-K', '8-K/A',
    // Proxy
    'DEF 14A', 'DEFA14A', 'DEFM14A', 'PRE 14A', 'DEFR14A', 'PREM14A',
    // Insider transactions
    '3', '4', '5',
    // Beneficial ownership
    'SC 13G', 'SC 13G/A', 'SC 13D', 'SC 13D/A',
    // M&A
    '425', 'SC TO-T', 'SC TO-I', 'S-4',
    // Capital raises
    'S-1', 'S-1/A', 'S-3', 'S-3/A', '424B4', '424B3', '424B5', 'FWP',
    // Institutional holdings
    '13F-HR', '13F-HR/A',
    // Foreign issuers
    '20-F', '20-F/A', '6-K', '40-F',
    // Admin / SEC correspondence
    'CORRESP', 'UPLOAD', 'EFFECT', 'SD',
];
function isSupportedForm(s) {
    return exports.SUPPORTED_FORMS.includes(s);
}
