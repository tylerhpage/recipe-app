require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const CSV_PATH = path.join(__dirname, "..", "data", "ingredient_lookup.csv");
const BATCH_SIZE = 100;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment. Check your .env file."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function parseCSV(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw.split(/\r?\n/);
  const header = lines[0].split(",").map((h) => h.trim());

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle quoted fields
    const fields = [];
    let current = "";
    let inQuotes = false;
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());

    const row = {};
    header.forEach((col, idx) => {
      row[col] = fields[idx] !== undefined ? fields[idx] : "";
    });
    rows.push(row);
  }
  return rows;
}

async function main() {
  console.log(`Reading CSV from: ${CSV_PATH}`);
  const rows = parseCSV(CSV_PATH);
  console.log(`Parsed ${rows.length} rows from CSV.\n`);

  const validRows = [];
  let skipped = 0;

  for (const row of rows) {
    if (!row.name || !row.name.trim()) {
      skipped++;
      continue;
    }
    validRows.push({
      name: row.name.trim(),
      canonical_name: (row.canonical_name || "").trim(),
      grocery_category: (row.grocery_category || "").trim(),
      aliases: (row.aliases || "").trim(),
      usage_count: 0,
    });
  }

  console.log(`Valid rows to insert: ${validRows.length}`);
  console.log(`Skipped (empty name): ${skipped}\n`);

  let totalInserted = 0;
  let totalErrors = 0;

  for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
    const batch = validRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("ingredient_lookup").insert(batch);

    if (error) {
      console.error(
        `  ERROR on batch starting at row ${i + 1}: ${error.message}`
      );
      totalErrors += batch.length;
    } else {
      totalInserted += batch.length;
      console.log(`  Inserted ${totalInserted} / ${validRows.length}...`);
    }
  }

  console.log("\n--- Import complete ---");
  console.log(`Total inserted:  ${totalInserted}`);
  console.log(`Total errors:    ${totalErrors}`);
  console.log(`Skipped (empty): ${skipped}`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
