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

import { Injectable, signal } from "@angular/core";

/**
 * @classdesc This class handles the logic to find and save the dynamically determined port of the OmnAI Backend
 * It provides the currently determined port as a signal. The state can be updated by calling the init() function.
 */
@Injectable({
    providedIn: 'root',
  })
export class BackendPortService {
  port = signal<number | null>(null);
  analysisPort = signal<number | null>(null);
  /**
   * @description receiving of Backend Port via IPC from the electron app
   * If no electron environment is used a warning is printed.
   * @async
   * @usage Init function should only be used once in the app initializer context (app.config.ts)
   */
  async init():Promise<void>{
      if (typeof window !== 'undefined' && window.electronAPI) {
          const port = await window.electronAPI.getOmnAIScopeBackendPort();
          this.port.set(port);

          const analysisPort = await window.electronAPI.getAnalysisBackendPort();
          this.analysisPort.set(analysisPort);
        } else {
          console.warn('Electron API not available (probably SSR)');
        }
  }
}
