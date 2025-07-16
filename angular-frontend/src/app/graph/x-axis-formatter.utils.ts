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

import { type NumberValue, timeFormat } from "d3";

export type xAxisMode = 'absolute' | 'relative';

export function makeXAxisTickFormatter(
  mode: xAxisMode,
  domainStart: NumberValue | Date
): (domainValue: NumberValue | Date, index: number) => string {
  const formatAbsolute = timeFormat('%H:%M:%S');
  const formatRelative = timeFormat('%M:%S');

  return (d, _index) => {
    if (mode === 'absolute') {
      if (d instanceof Date) return formatAbsolute(d);
      return formatAbsolute(new Date(Number(d)));
    } else {
      const t = d instanceof Date ? d.getTime() : Number(d);
      const t0 = domainStart instanceof Date ? domainStart.getTime() : Number(domainStart);
      const elapsed = Math.max(0, t - t0);
      return formatRelative(new Date(elapsed));
    }
  };
}
