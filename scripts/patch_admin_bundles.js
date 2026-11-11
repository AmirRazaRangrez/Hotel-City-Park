const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'admin', 'dist', '_expo', 'static', 'js', 'web');
if (!fs.existsSync(dir)) {
  console.log('Dir does not exist:', dir);
  process.exit(0);
}

const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
console.log(`Found ${files.length} bundle files to check/patch in ${dir}`);

const t1 = 'h&&TA>0&&LA<TA&&(LA=TA);';
const r1 = '/*LA*/;';

const t2 = 'h&&TA>qA&&hA.push(`Other Extras: \\u20b9${(TA-qA).toLocaleString(\'en-IN\')}`);';
const r2 = '/*no-other*/;';

const t3 = 'const FA=S?Math.round(.05*IA*100)/100:0';
const r3 = 'const FA=S?(Number(A.taxAmount||A.stayTax||A.summary?.stayTax)||Math.round((IA-(IA/1.05))*100)/100):0';

const t4 = "${h?'(In Voucher)':'(Included in Voucher)'}";
const r4 = "${h?'(In Voucher)':'(Included in Bill)'}";

const t5 = '<span>Extra Booking @ Hotel: <strong>\\u20b9 ${LA.toLocaleString(\'en-IN\')}</strong>${sA>0?` (Extra Mattress(es): <strong>\\u20b9 ${sA.toLocaleString(\'en-IN\')}</strong>)`:\'\'}${ZA>0?` (F&amp;B Orders: <strong>\\u20b9 ${ZA.toLocaleString(\'en-IN\')}</strong>)`:\'\'}</span>';
const r5 = '<span>Extra Booking @ Hotel: <strong>\\u20b9 ${LA.toLocaleString(\'en-IN\')}</strong>${hA.length>0?` (${a(hA.join(\' \\u2022 \'))})`:\'\'}</span>';

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  if (content.includes(t1)) {
    content = content.replaceAll(t1, r1);
    changed = true;
  }
  if (content.includes(t2)) {
    content = content.replaceAll(t2, r2);
    changed = true;
  }
  if (content.includes(t3)) {
    content = content.replaceAll(t3, r3);
    changed = true;
  }
  if (content.includes(t4)) {
    content = content.replaceAll(t4, r4);
    changed = true;
  }
  if (content.includes(t5)) {
    content = content.replaceAll(t5, r5);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Successfully patched: ${file}`);
  } else {
    console.log(`Already patched or targets not found: ${file}`);
  }
}
