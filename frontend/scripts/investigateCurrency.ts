import fs from 'fs';
import path from 'path';

function walk(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(walk(full));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(full);
    }
  }
  return results;
}

const srcDir = path.resolve(process.cwd(), 'src');
const files = walk(srcDir);

interface Item {
  file: string;
  line: number;
  snippet: string;
  category: string;
}

const items: Item[] = [];

for (const file of files) {
  const relPath = path.relative(process.cwd(), file).replace(/\\/g, '/');
  // Skip test files or investigation script itself
  if (relPath.includes('test') || relPath.includes('investigate')) continue;

  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();

    // Check genuine currency patterns:
    // 1. Literal '$' followed by digit: $100, $0.00
    // 2. '$$' (e.g. `$${amount}`)
    // 3. '$ ' or ' $' inside strings or JSX
    // 4. `>$` or `>$<` or `> $`
    // 5. Currency labels: USD, INR, Rs., Rs
    // 6. toFixed(2) on money fields

    let cat = '';

    if (/\$\$\{/.test(line)) {
      cat = 'Dollar template ($${...})';
    } else if (/\$\d+/.test(line) && !line.includes('regex') && !line.includes('replace(')) {
      cat = 'Hardcoded dollar amount ($123)';
    } else if (/(?:['"`]\$|['"`]\s*\$|>\s*\$\s*<|>\s*\$\s*\{|>\s*\$[a-zA-Z0-9])/i.test(line)) {
      cat = 'Dollar symbol JSX/String';
    } else if (/(?:Float|Collections|Cash|Revenue|Tariff|Total|Fee|Price|Cost|Paid|Balance|Deposit|Amount|Discount|Subtotal|Bill|Invoice|Earnings):\s*['"`]?\s*\$/i.test(line)) {
      cat = 'Label with dollar sign';
    } else if (/\bUSD\b/.test(line) && !line.includes('Date') && !line.includes('uuid')) {
      cat = 'Currency code USD';
    } else if (/\b(?:Rs\.?|INR)\b/i.test(line)) {
      cat = 'Currency code INR/Rs';
    } else if (/\.toFixed\(2\)/.test(line)) {
      cat = 'toFixed(2) money format';
    } else if (/\$\{\s*[a-zA-Z0-9_.]*(?:fee|amount|cost|price|total|revenue|paid|balance|float|tax|subtotal|discount|deposit|tariff)[^}]*\}\.00/i.test(line)) {
      cat = 'Money amount with .00 cents';
    }

    if (cat) {
      items.push({
        file: relPath,
        line: lineNum,
        snippet: trimmed,
        category: cat,
      });
    }
  });
}

// Group by module
const moduleGroups: Record<string, Item[]> = {};
for (const item of items) {
  let mod = 'Other';
  if (item.file.includes('reception')) mod = 'Reception Module';
  else if (item.file.includes('billing')) mod = 'Billing & Accounts Module';
  else if (item.file.includes('admin')) mod = 'Admin & Organization Module';
  else if (item.file.includes('department')) mod = 'Department Workspaces & Master Settings';
  else if (item.file.includes('doctor')) mod = 'Doctor & Assistant Workstation';
  else if (item.file.includes('ipd')) mod = 'Inpatient (IPD) Module';
  else if (item.file.includes('ot')) mod = 'Operation Theatre (OT) Module';
  else if (item.file.includes('lab')) mod = 'Laboratory Module';
  else if (item.file.includes('pharmacy')) mod = 'Pharmacy Module';
  else if (item.file.includes('services') || item.file.includes('types')) mod = 'Data Layer & Types';

  if (!moduleGroups[mod]) moduleGroups[mod] = [];
  moduleGroups[mod].push(item);
}

let report = `# Currency & Money Formatting Investigation Report\n\n`;
report += `Total genuine money/currency locations found: **${items.length}** across **${new Set(items.map(i => i.file)).size} files**.\n\n`;

for (const [mod, modItems] of Object.entries(moduleGroups)) {
  report += `## ${mod} (${modItems.length} locations)\n\n`;
  const fileGroups: Record<string, Item[]> = {};
  for (const i of modItems) {
    if (!fileGroups[i.file]) fileGroups[i.file] = [];
    fileGroups[i.file].push(i);
  }
  for (const [file, fileItems] of Object.entries(fileGroups)) {
    report += `### \`${file}\` (${fileItems.length} locations)\n`;
    fileItems.forEach(i => {
      report += `- **Line ${i.line}** [\`${i.category}\`]: \`${i.snippet.replace(/`/g, '\\`')}\`\n`;
    });
    report += `\n`;
  }
}

fs.writeFileSync('scripts/currency_report.md', report, 'utf-8');
console.log('Report generated at scripts/currency_report.md');
console.log(`Summary: ${items.length} locations across ${new Set(items.map(i => i.file)).size} files.`);
for (const [mod, modItems] of Object.entries(moduleGroups)) {
  console.log(` - ${mod}: ${modItems.length} occurrences across ${new Set(modItems.map(i => i.file)).size} files`);
}
