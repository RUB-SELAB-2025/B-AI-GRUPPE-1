/*
 * MIT License
 *
 * Copyright (c) 2025 AI-Gruppe
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

// This script fetches the current version in the package.json File and writes into
// /electron/src/version.json. This is used for debug reasons and in the Electron App.

const fs = require('fs');
const path = require('path');

const electronPkgPath = path.join(__dirname, 'electron', 'package.json');
const angularPkgPath = path.join(__dirname, 'angular-frontend', 'package.json');

const electronPkg = JSON.parse(fs.readFileSync(electronPkgPath, 'utf-8'));
const angularPkg = JSON.parse(fs.readFileSync(angularPkgPath, 'utf-8'));

const versionInfo = {
    electronVersion: electronPkg.version,
    angularVersion: angularPkg.version,
    generatedAt: new Date().toISOString()
};

const outputPath = path.join(__dirname, '/electron/src/version.json');

fs.writeFileSync(outputPath, JSON.stringify(versionInfo, null, 2), 'utf-8');
console.log(versionInfo);