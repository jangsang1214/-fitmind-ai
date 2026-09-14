'use strict';
const fs=require('node:fs');
const path=require('node:path');
const Food=require('../02_core/food-data-foundation-v2.js');

const root=path.resolve(__dirname,'..');
const foods=JSON.parse(fs.readFileSync(path.join(root,'04_data/knowledge/food-db.json'),'utf8'));
const report=Food.audit(foods);
const output={
  version:report.version,
  total:report.total,
  statusCounts:report.statusCounts,
  errors:report.errors.length,
  warnings:report.warnings.length,
  duplicateNames:report.duplicateNames.length,
  aliasCollisions:report.aliasCollisions.length,
  topErrors:report.errors.slice(0,20),
  topWarnings:report.warnings.slice(0,20)
};
console.log(JSON.stringify(output,null,2));
if(!report.pass)process.exitCode=1;
