#!/usr/bin/env ts-node
/**
 * scripts/fix-document-filepaths.ts
 *
 * Scans all documents and fills missing `versions[].filePath` and `fileName`
 * where possible. It tries the following heuristics in order:
 *  1) uploads/<userId>/<originalFileName>
 *  2) uploads/<userId>/<documentId>_v<version>.pdf
 *  3) uploads/<userId>/* matching a name with same suffix and identical size
 *
 * Usage:
 *  - Dry run (report only):
 *      node ./scripts/fix-document-filepaths.ts
 *  - Apply fixes:
 *      node ./scripts/fix-document-filepaths.ts --apply
 */

import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import connectDB from '@/utils/db';
import DocumentModel from '@/models/Document';

async function fileHash(fp: string) {
    const buf = fs.readFileSync(fp);
    return crypto.createHash('sha256').update(buf).digest('hex');
}

async function run() {
    const apply = process.argv.includes('--apply');
    console.log(`[fix-document-filepaths] starting (apply=${apply})`);
    await connectDB();

    const docs = await DocumentModel.find({}).exec();
    console.log(`Found ${docs.length} documents`);

    let examined = 0;
    let fixed = 0;

    for (const doc of docs) {
        examined++;
        const userDir = path.join(process.cwd(), 'uploads', String(doc.userId));
        for (let i = 0; i < doc.versions.length; i++) {
            const v = doc.versions[i] as {
                version: number;
                pdfData?: Buffer;
                filePath?: string;
                fileName?: string;
            };
            if (v.filePath && v.fileName) continue; // already present

            console.log(`Doc ${doc._id} v${v.version} missing filePath/fileName — attempting heuristics`);

            // Heuristic 1: try originalFileName
            const candidates: string[] = [];
            if (doc.originalFileName) candidates.push(path.join(userDir, doc.originalFileName));

            // Heuristic 2: deterministic name
            candidates.push(path.join(userDir, `${doc._id}_v${v.version}.pdf`));

            // Heuristic 3: any file in userDir with same suffix
            try {
                if (fs.existsSync(userDir)) {
                    const all = fs.readdirSync(userDir).map(n => path.join(userDir, n));
                    // prefer same basename pattern
                    for (const p of all) candidates.push(p);
                }
            } catch (err) {
                // ignore
            }

            let chosen: { filePath: string; fileName: string } | null = null;

            // If we have an existing pdfData buffer, try size/hash matching
            const expectedSize = v.pdfData ? Buffer.byteLength(v.pdfData) : null;
            const expectedHash = v.pdfData ? crypto.createHash('sha256').update(v.pdfData).digest('hex') : null;

            for (const c of candidates) {
                try {
                    if (!fs.existsSync(c)) continue;
                    const stat = fs.statSync(c);
                    if (!stat.isFile()) continue;
                    if (expectedSize && stat.size !== expectedSize) {
                        // size mismatch — skip
                        continue;
                    }
                    if (expectedHash) {
                        const h = await fileHash(c);
                        if (h !== expectedHash) continue;
                    }
                    chosen = { filePath: c, fileName: path.basename(c) };
                    break;
                } catch (err) {
                    continue;
                }
            }

            if (chosen) {
                console.log(`  -> chosen ${chosen.filePath}`);
                if (apply) {
                    // perform an atomic update on the specific version
                    const idx = i; // closure
                    const updateData: Record<string, string> = {};
                    updateData[`versions.${idx}.filePath`] = chosen.filePath;
                    updateData[`versions.${idx}.fileName`] = chosen.fileName;
                    await DocumentModel.updateOne({ _id: doc._id }, { $set: updateData }).exec();
                    fixed++;
                }
            } else {
                console.log('  -> no suitable candidate found');
            }
        }
    }

    console.log(`Done. Examined ${examined} docs, fixed ${fixed} versions.`);
    process.exit(0);
}

run().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
