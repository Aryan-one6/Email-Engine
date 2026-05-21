interface IdentityMappingRow {
  source_column: string;
  target_type: 'core' | 'custom';
  target_key: string;
}

interface IdentityCoreOverrides {
  email?: unknown;
  phone?: unknown;
  company_name?: unknown;
}

export interface ImportIdentityConfig {
  mappings: IdentityMappingRow[];
  source_id_columns?: string[];
  core_overrides?: IdentityCoreOverrides;
}

export interface ImportIdentityResult {
  external_source: string;
  external_key: string;
  raw_identity: string;
  source_id: string | null;
  normalized_identity: {
    email: string;
    phone: string;
    company_name: string;
  };
}

const FALLBACK_SOURCE_ID_COLUMNS = [
  'id',
  'record_id',
  'lead_id',
  'contact_id',
  'external_id',
  'crm_id',
];

const FALLBACK_EMAIL_COLUMNS = ['email', 'email_address'];
const FALLBACK_PHONE_COLUMNS = ['phone', 'phone_number', 'mobile', 'mobile_number', 'whatsapp', 'whatsapp_number'];
const FALLBACK_COMPANY_COLUMNS = ['company_name', 'company', 'organization', 'org_name', 'business_name'];

function normalizeWhitespace(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim().replace(/\s+/g, ' ');
}

function getMappedColumnValue(row: Record<string, unknown>, mappings: IdentityMappingRow[], targetKey: string) {
  const mapping = mappings.find((item) => item.target_type === 'core' && item.target_key === targetKey);

  if (!mapping) {
    return undefined;
  }

  return row[mapping.source_column];
}

function getRowValueFromColumns(row: Record<string, unknown>, columns: string[]) {
  for (const column of columns) {
    const direct = row[column];
    const normalizedDirect = normalizeWhitespace(direct);

    if (normalizedDirect) {
      return normalizedDirect;
    }

    const caseInsensitiveKey = Object.keys(row).find((key) => key.toLowerCase() === column.toLowerCase());

    if (!caseInsensitiveKey) {
      continue;
    }

    const normalizedCaseInsensitive = normalizeWhitespace(row[caseInsensitiveKey]);

    if (normalizedCaseInsensitive) {
      return normalizedCaseInsensitive;
    }
  }

  return '';
}

function normalizeSourceName(sourceName: string) {
  const normalized = normalizeWhitespace(sourceName).toLowerCase().replace(/[^a-z0-9._-]+/g, '_');
  return normalized || 'unknown_source';
}

function normalizeIdentityEmail(value: unknown) {
  return normalizeWhitespace(value).toLowerCase();
}

function normalizeIdentityPhone(value: unknown) {
  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return '';
  }

  const noExtension = normalized.replace(/\b(ext|extension|x)\b[\s:.-]*\d+$/i, '').trim();
  return noExtension.replace(/\D+/g, '');
}

function normalizeIdentityCompanyName(value: unknown) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveSourceId(
  row: Record<string, unknown>,
  mappings: IdentityMappingRow[],
  configuredSourceIdColumns: string[] | undefined,
) {
  const preferredColumns = configuredSourceIdColumns
    ?.map((column) => normalizeWhitespace(column))
    .filter(Boolean) ?? [];
  const configured = getRowValueFromColumns(row, preferredColumns);

  if (configured) {
    return configured;
  }

  const mappedSourceId = getMappedColumnValue(row, mappings, 'external_id')
    ?? getMappedColumnValue(row, mappings, 'source_system_id');
  const normalizedMappedSourceId = normalizeWhitespace(mappedSourceId);

  if (normalizedMappedSourceId) {
    return normalizedMappedSourceId;
  }

  return getRowValueFromColumns(row, FALLBACK_SOURCE_ID_COLUMNS);
}

export async function sha256Hex(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(digest));
  return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function buildImportIdentityKey(
  row: Record<string, unknown>,
  mappingConfig: ImportIdentityConfig,
  sourceName: string,
): Promise<ImportIdentityResult> {
  const externalSource = `csv_import:${normalizeSourceName(sourceName)}`;
  const sourceId = resolveSourceId(row, mappingConfig.mappings, mappingConfig.source_id_columns);

  if (sourceId) {
    return {
      external_source: externalSource,
      external_key: `id:${sourceId}`,
      raw_identity: `id:${sourceId}`,
      source_id: sourceId,
      normalized_identity: {
        email: '',
        phone: '',
        company_name: '',
      },
    };
  }

  const emailRaw = mappingConfig.core_overrides?.email
    ?? getMappedColumnValue(row, mappingConfig.mappings, 'email')
    ?? getRowValueFromColumns(row, FALLBACK_EMAIL_COLUMNS);
  const phoneRaw = mappingConfig.core_overrides?.phone
    ?? getMappedColumnValue(row, mappingConfig.mappings, 'phone')
    ?? getRowValueFromColumns(row, FALLBACK_PHONE_COLUMNS);
  const companyRaw = mappingConfig.core_overrides?.company_name
    ?? getMappedColumnValue(row, mappingConfig.mappings, 'company_name')
    ?? getRowValueFromColumns(row, FALLBACK_COMPANY_COLUMNS);

  const normalizedIdentity = {
    email: normalizeIdentityEmail(emailRaw),
    phone: normalizeIdentityPhone(phoneRaw),
    company_name: normalizeIdentityCompanyName(companyRaw),
  };

  const identityParts = [
    normalizedIdentity.email ? `email=${normalizedIdentity.email}` : '',
    normalizedIdentity.phone ? `phone=${normalizedIdentity.phone}` : '',
    normalizedIdentity.company_name ? `company_name=${normalizedIdentity.company_name}` : '',
  ].filter(Boolean);

  if (identityParts.length === 0) {
    throw new Error('Unable to generate deterministic identity key');
  }

  const rawIdentity = identityParts.join('|');

  return {
    external_source: externalSource,
    external_key: await sha256Hex(rawIdentity),
    raw_identity: rawIdentity,
    source_id: null,
    normalized_identity: normalizedIdentity,
  };
}
