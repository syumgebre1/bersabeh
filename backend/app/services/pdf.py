"""
PDF generation service using WeasyPrint + Jinja2 + qrcode.

Each render_* function returns raw PDF bytes for the given document type.
Rendering happens server-side, so the client just downloads the result.

Design:
  - Single Jinja2 template per document type (embedded as strings here
    for portability; can be moved to templates/ later if they grow).
  - Clinic metadata (name, address, phone, license) comes from
    app.core.clinic_config — the CMS will eventually override at runtime.
  - Each PDF includes a QR code linking to a verification URL.
  - "Urban Ethio" palette in the header/footer.

WeasyPrint notes:
  - It renders CSS via the same engine as browsers (Paged Media).
  - Uses system fonts — install Noto Sans Ethiopic for Amharic/Tigrigna.
  - set `@page { size: A4; margin: 15mm 15mm 20mm 15mm; }` for print layout.
"""

from __future__ import annotations

import base64
import io
from datetime import datetime, timezone
from typing import Any

import qrcode
from jinja2 import Environment, select_autoescape
from weasyprint import HTML

from app.core.clinic_config import CLINIC


# ------------------------------------------------------------
# Jinja2 environment — autoescape HTML for safety
# ------------------------------------------------------------
_env = Environment(
    autoescape=select_autoescape(["html", "xml"]),
    trim_blocks=True,
    lstrip_blocks=True,
)


# ------------------------------------------------------------
# Shared CSS — "Urban Ethio" design system for print
# ------------------------------------------------------------
BASE_CSS = """
@page {
  size: A4;
  margin: 15mm 15mm 20mm 15mm;
  @bottom-center {
    content: "Bersabeh Clinic · " counter(page) " / " counter(pages);
    font-size: 9pt;
    color: #6B6B7B;
  }
}

* { box-sizing: border-box; }

body {
  font-family: -apple-system, "Inter", "Helvetica Neue", Arial, sans-serif;
  color: #14141F;
  font-size: 11pt;
  line-height: 1.45;
  margin: 0;
}

h1, h2, h3 { font-family: "Space Grotesk", -apple-system, Arial, sans-serif; margin: 0; }

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 8mm;
  border-bottom: 3px solid #2A2A72;
  margin-bottom: 8mm;
}

.brand {
  font-size: 22pt;
  font-weight: 700;
  color: #2A2A72;
  letter-spacing: -0.5px;
}

.brand-sub {
  font-size: 9pt;
  color: #6B6B7B;
  margin-top: 2mm;
}

.doc-meta {
  text-align: right;
  font-size: 9pt;
  color: #6B6B7B;
  line-height: 1.5;
}

.doc-title {
  font-size: 16pt;
  color: #C75B39;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 2mm;
}

.section {
  margin: 6mm 0;
}

.section-title {
  font-size: 10pt;
  font-weight: 700;
  color: #2A2A72;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #E5E0D5;
  padding-bottom: 1.5mm;
  margin-bottom: 3mm;
}

.kv-grid {
  display: grid;
  grid-template-columns: 35% 65%;
  gap: 2mm 4mm;
  font-size: 10pt;
}

.kv-key { color: #6B6B7B; }
.kv-val { color: #14141F; font-weight: 500; }

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10pt;
}

th {
  background: #FBF8F3;
  text-align: left;
  padding: 2.5mm 3mm;
  border-bottom: 2px solid #2A2A72;
  color: #2A2A72;
  font-weight: 700;
  font-size: 9pt;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

td {
  padding: 2.5mm 3mm;
  border-bottom: 1px solid #E5E0D5;
  vertical-align: top;
}

tr:nth-child(even) td { background: #FBF8F3; }

.notes {
  background: #FBF8F3;
  border-left: 3px solid #C75B39;
  padding: 3mm 4mm;
  font-size: 10pt;
  white-space: pre-wrap;
}

.signature {
  margin-top: 12mm;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.signature-block {
  width: 60%;
}

.signature-line {
  border-top: 1px solid #14141F;
  padding-top: 2mm;
  font-size: 9pt;
  color: #6B6B7B;
}

.qr-block {
  text-align: right;
}

.qr-block img { width: 28mm; height: 28mm; }
.qr-caption {
  font-size: 7pt;
  color: #6B6B7B;
  margin-top: 1mm;
}

.footer {
  margin-top: 10mm;
  padding-top: 4mm;
  border-top: 1px solid #E5E0D5;
  font-size: 8pt;
  color: #6B6B7B;
  text-align: center;
  line-height: 1.5;
}
"""


# ------------------------------------------------------------
# HTML templates
# ------------------------------------------------------------
BASE_HEADER = """
<div class="header">
  <div>
    <div class="brand">{{ clinic.name }}</div>
    <div class="brand-sub">{{ clinic.full_address }}</div>
    <div class="brand-sub">Tel: {{ clinic.reception_phone }} · Emergency: {{ clinic.emergency_phone }}</div>
  </div>
  <div class="doc-meta">
    <div class="doc-title">{{ doc_title }}</div>
    <div><strong>Issued:</strong> {{ issued_at }}</div>
    <div><strong>License:</strong> {{ clinic.license_number }}</div>
    <div><strong>Ref:</strong> {{ ref_id }}</div>
  </div>
</div>
"""


BASE_FOOTER = """
<div class="footer">
  {{ clinic.name }} · {{ clinic.full_address }}<br>
  License {{ clinic.license_number }} · {{ clinic.email }}<br>
  This document was generated electronically. Verify at {{ verify_url }}
</div>
"""


PRESCRIPTION_TEMPLATE = """
<!doctype html>
<html><head><meta charset="utf-8"><title>Prescription</title>
<style>{{ css }}</style></head>
<body>

{{ header | safe }}

<div class="section">
  <div class="section-title">Patient</div>
  <div class="kv-grid">
    <div class="kv-key">Name</div><div class="kv-val">{{ patient.full_name }}</div>
    <div class="kv-key">Phone</div><div class="kv-val">{{ patient.phone or "—" }}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">Prescriber</div>
  <div class="kv-grid">
    <div class="kv-key">Doctor</div><div class="kv-val">{{ doctor.full_name }}</div>
    <div class="kv-key">Specialty</div><div class="kv-val">{{ doctor.specialty or "—" }}</div>
    <div class="kv-key">License</div><div class="kv-val">{{ doctor.license_number or "—" }}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">Medications</div>
  <table>
    <thead>
      <tr>
        <th style="width: 32%">Medication</th>
        <th style="width: 18%">Dose</th>
        <th style="width: 22%">Frequency</th>
        <th style="width: 12%">Duration</th>
        <th style="width: 16%">Instructions</th>
      </tr>
    </thead>
    <tbody>
      {% for item in items %}
      <tr>
        <td><strong>{{ item.medication_name }}</strong></td>
        <td>{{ item.dose }}</td>
        <td>{{ item.frequency }}</td>
        <td>{{ (item.duration_days ~ " days") if item.duration_days else "—" }}</td>
        <td>{{ item.instructions or "—" }}</td>
      </tr>
      {% endfor %}
    </tbody>
  </table>
</div>

{% if notes %}
<div class="section">
  <div class="section-title">Doctor's Notes</div>
  <div class="notes">{{ notes }}</div>
</div>
{% endif %}

{% if follow_up_date %}
<div class="section">
  <div class="section-title">Follow-up</div>
  <div class="kv-grid">
    <div class="kv-key">Date</div><div class="kv-val">{{ follow_up_date }}</div>
  </div>
</div>
{% endif %}

<div class="signature">
  <div class="signature-block">
    <div class="signature-line">Prescriber signature</div>
  </div>
  <div class="qr-block">
    <img src="data:image/png;base64,{{ qr_b64 }}" alt="QR">
    <div class="qr-caption">Scan to verify</div>
  </div>
</div>

{{ footer | safe }}

</body></html>
"""


LAB_REPORT_TEMPLATE = """
<!doctype html>
<html><head><meta charset="utf-8"><title>Lab Report</title>
<style>{{ css }}</style></head>
<body>

{{ header | safe }}

<div class="section">
  <div class="section-title">Patient</div>
  <div class="kv-grid">
    <div class="kv-key">Name</div><div class="kv-val">{{ patient.full_name }}</div>
    <div class="kv-key">Phone</div><div class="kv-val">{{ patient.phone or "—" }}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">Test Ordered</div>
  <div class="kv-grid">
    <div class="kv-key">Test</div><div class="kv-val">{{ test_name }}</div>
    <div class="kv-key">Ordered by</div><div class="kv-val">{{ doctor.full_name }}</div>
    <div class="kv-key">Priority</div><div class="kv-val">{{ priority|upper }}</div>
    <div class="kv-key">Ordered at</div><div class="kv-val">{{ ordered_at }}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">Result</div>
  <table>
    <thead>
      <tr>
        <th style="width: 25%">Result</th>
        <th style="width: 20%">Units</th>
        <th style="width: 25%">Reference Range</th>
        <th style="width: 30%">Interpretation</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>{{ result_display }}</strong></td>
        <td>{{ units or "—" }}</td>
        <td>{{ reference_range or "—" }}</td>
        <td>{{ interpretation or "—" }}</td>
      </tr>
    </tbody>
  </table>
</div>

{% if lab_notes %}
<div class="section">
  <div class="section-title">Lab Notes</div>
  <div class="notes">{{ lab_notes }}</div>
</div>
{% endif %}

<div class="signature">
  <div class="signature-block">
    <div class="signature-line">Lab technologist signature</div>
  </div>
  <div class="qr-block">
    <img src="data:image/png;base64,{{ qr_b64 }}" alt="QR">
    <div class="qr-caption">Scan to verify</div>
  </div>
</div>

{{ footer | safe }}

</body></html>
"""


# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------
def _make_qr_base64(text: str) -> str:
    """Render a QR code as base64 PNG for embedding in HTML."""
    qr = qrcode.QRCode(version=None, box_size=6, border=1)
    qr.add_data(text)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#2A2A72", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")


def _build_common_context(ref_id: str, doc_title: str) -> dict[str, Any]:
    verify_url = f"https://bersabehclinic.com/verify/{ref_id}"
    return {
        "clinic": CLINIC,
        "doc_title": doc_title,
        "ref_id": ref_id,
        "verify_url": verify_url,
        "issued_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "css": BASE_CSS,
        "qr_b64": _make_qr_base64(verify_url),
    }


def _render_html_to_pdf(html: str) -> bytes:
    """Render an HTML string to PDF bytes via WeasyPrint."""
    return HTML(string=html).write_pdf()


# ------------------------------------------------------------
# Public API — one function per document
# ------------------------------------------------------------
def render_prescription_pdf(data: dict[str, Any]) -> bytes:
    """
    data keys:
      ref_id, patient, doctor, items, notes, follow_up_date
    """
    ctx = _build_common_context(ref_id=str(data["ref_id"]), doc_title="Prescription")
    ctx.update({
        "patient": data["patient"],
        "doctor": data["doctor"],
        "items": data["items"],
        "notes": data.get("notes"),
        "follow_up_date": data.get("follow_up_date"),
    })
    ctx["header"] = _env.from_string(BASE_HEADER).render(**ctx)
    ctx["footer"] = _env.from_string(BASE_FOOTER).render(**ctx)
    html = _env.from_string(PRESCRIPTION_TEMPLATE).render(**ctx)
    return _render_html_to_pdf(html)


def render_lab_report_pdf(data: dict[str, Any]) -> bytes:
    """
    data keys:
      ref_id, patient, doctor, test_name, priority, ordered_at,
      result_display, units, reference_range, interpretation, lab_notes
    """
    ctx = _build_common_context(ref_id=str(data["ref_id"]), doc_title="Lab Report")
    ctx.update({
        "patient": data["patient"],
        "doctor": data["doctor"],
        "test_name": data["test_name"],
        "priority": data["priority"],
        "ordered_at": data["ordered_at"],
        "result_display": data["result_display"],
        "units": data.get("units"),
        "reference_range": data.get("reference_range"),
        "interpretation": data.get("interpretation"),
        "lab_notes": data.get("lab_notes"),
    })
    ctx["header"] = _env.from_string(BASE_HEADER).render(**ctx)
    ctx["footer"] = _env.from_string(BASE_FOOTER).render(**ctx)
    html = _env.from_string(LAB_REPORT_TEMPLATE).render(**ctx)
    return _render_html_to_pdf(html)
