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

import { Injectable } from "@angular/core";

@Injectable({
    providedIn: 'root'
})
export class OmnAIScopePortService {
    async loadOmnAIScopeBackendPort(): Promise<number> {
        if (window.electronAPI) { // only works with angular combined with the correct electron app
            try {
                const backendPort = await window.electronAPI.getOmnAIScopeBackendPort();
                console.log("Current OmnAIScope Datatserver Backend Port (Angular):", backendPort);
                return backendPort;
            } catch (error) {
                console.error("Error: Trying to get local OmnAIScope Dataserver Backend Port from Angular app")
                throw error;
            }
        }
        else {
            const errorMsg = "electronAPI is not available. Do you run the app in an electron context ? ";
            console.error(errorMsg);
            throw new Error(errorMsg);
        }
    }
}
