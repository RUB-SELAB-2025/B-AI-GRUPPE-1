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

import {
  computed,
  effect,
  inject,
  Injectable,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import {
  scaleLinear as d3ScaleLinear,
  scaleUtc as d3ScaleUtc,
} from 'd3-scale';
import { line as d3Line } from 'd3-shape';
import { DataSourceSelectionService } from '../source-selection/data-source-selection.service';

type UnwrapSignal<T> = T extends import('@angular/core').Signal<infer U> ? U : never;

/**
 * Describes the potential Domain values for the x-axis
 * */
type xDomainType = Date;
type xDomainTuple = [xDomainType, xDomainType];

const defaultXDomain: xDomainTuple = [new Date(), new Date(Date.now() - 24 * 60 * 60 * 1000)];

/**
 * Provide the data to be displayed in the {@link GraphComponent}
 * This class also provides the axis descriptions. As these are dependend on the size of the current
 * graph, this service needs to be provided in any component that creates a graph to ensure that
 * every graph has its own state management.
 *  */
@Injectable()
export class DataSourceService {
  private readonly $graphDimensions = signal({ width: 800, height: 600 });
  private readonly $xDomain = signal<xDomainTuple>(defaultXDomain);
  private readonly $yDomain = signal([0, 100]);
  private readonly dataSourceSelectionService = inject(DataSourceSelectionService);
  private readonly $isZoomed = signal(false);
  private readonly $xDomainMinimap = signal<[Date, Date]>([new Date(), new Date()]);
  private readonly $yDomainMinimap = signal<[number, number]>([0, 0]);
  private readonly $minimapDimensions = signal({ width: 200, height: 150 });

  readonly minimapDimensions = this.$minimapDimensions.asReadonly();
  readonly updateMinimapDomainsWhenDataChanges = effect(() => {
    const data = this.dummySeries();
    if (Object.keys(data).length === 0) return;
    this.scaleAxisToDataMinimap(data);
  });

  readonly zoomWindowInMinimap = computed(() => {
    const [mainX0, mainX1] = this.$xDomain();
    const [mainY0, mainY1] = this.$yDomain();
    const [miniX0, miniX1] = this.$xDomainMinimap();
    const [miniY0, miniY1] = this.$yDomainMinimap();

    const xScaleMini = this.xScaleMinimap();
    const yScaleMini = this.yScaleMinimap();

    const xStart = xScaleMini(mainX0);
    const xEnd = xScaleMini(mainX1);
    const yStart = yScaleMini(mainY1);
    const yEnd = yScaleMini(mainY0);

    return {
      x: xStart,
      y: yStart,
      width: xEnd - xStart,
      height: yEnd - yStart,
    };
  });


  readonly margin = { top: 20, right: 30, bottom: 40, left: 60 };
  graphDimensions = this.$graphDimensions.asReadonly();

  private readonly dummySeries = computed(() => {
    const selectedSource = this.dataSourceSelectionService.currentSource();
    if (!selectedSource) return {};
    return selectedSource.data();
  });

  innerWidth() {
    const dim = this.graphDimensions();
    return dim.width - this.margin.left - this.margin.right;
  }

  innerHeight() {
    const dim = this.graphDimensions();
    return dim.height - this.margin.top - this.margin.bottom;
  }

  readonly xScale = linkedSignal({
    source: () => ({
      dimensions: this.$graphDimensions(),
      xDomain: this.$xDomain(),
    }),
    computation: ({ dimensions, xDomain }) => {
      const { left, right } = this.margin;
      const width = dimensions.width - left - right;
      return d3ScaleUtc().domain(xDomain).range([0, width]);
    },
  });

  readonly yScale = linkedSignal({
    source: () => ({
      dimensions: this.$graphDimensions(),
      yDomain: this.$yDomain(),
    }),
    computation: ({ dimensions, yDomain }) => {
      const margin = { top: 20, right: 30, bottom: 40, left: 40 };
      const height = dimensions.height - margin.top - margin.bottom;
      return d3ScaleLinear()
        .domain(yDomain)
        .range([height, 0]);
    },
  });

  setZoomed(isZoomed: boolean) {
    this.$isZoomed.set(isZoomed);
  }

  setDomains(
    newX: [Date, Date],
    newY: [number, number]
  ): void {
    this.$xDomain.set(newX);
    this.$yDomain.set(newY);
    this.setZoomed(true);
  }

  updateGraphDimensions(settings: { width: number; height: number }) {
    const current = this.$graphDimensions();
    if (current.width !== settings.width || current.height !== settings.height) {
      this.$graphDimensions.set(settings);
    }
  }

  updateScalesWhenDataChanges = effect(() => {
    const data = this.dummySeries();
    if (this.$isZoomed()) return;

    untracked(() => this.scaleAxisToData(data));
  });

  private scaleAxisToData(data: UnwrapSignal<typeof this.dummySeries>) {
    if (Object.keys(data).length === 0) return;

    const expandBy = 0.1;
    const initial = {
      minTimestamp: Number.POSITIVE_INFINITY,
      maxTimestamp: Number.NEGATIVE_INFINITY,
      minValue: Number.POSITIVE_INFINITY,
      maxValue: Number.NEGATIVE_INFINITY,
    };

    const allPoints = Object.values(data).flat();

    const result = allPoints.reduce(
      (acc, point) => ({
        minTimestamp: Math.min(acc.minTimestamp, point.timestamp),
        maxTimestamp: Math.max(acc.maxTimestamp, point.timestamp),
        minValue: Math.min(acc.minValue, point.value),
        maxValue: Math.max(acc.maxValue, point.value),
      }),
      initial
    );

    if (!isFinite(result.minTimestamp) || !isFinite(result.minValue)) return;
    const xDomainRange = result.maxTimestamp - result.minTimestamp;
    const xExpansion = xDomainRange * expandBy;

    const yDomainRange = result.maxValue - result.minValue;
    const yExpansion = yDomainRange * expandBy;

    this.$xDomain.set([
      new Date(result.minTimestamp - xExpansion),
      new Date(result.maxTimestamp + xExpansion),
    ]);
    if (xDomainRange === 0) {
      this.$xDomain.set(defaultXDomain);
    }
    else {
      this.$xDomain.set([
        new Date(result.minTimestamp),
        new Date(result.maxTimestamp)
      ]);
    }

    this.$yDomain.set([
      result.minValue - yExpansion,
      result.maxValue + yExpansion,
    ]);
  }

  private scaleAxisToDataMinimap(data: UnwrapSignal<typeof this.dummySeries>) {
    if (Object.keys(data).length === 0) return;

    const allPoints = Object.values(data).flat();
    const timestamps = allPoints.map(p => p.timestamp);

    const minTimestamp = Math.min(...timestamps);
    const maxTimestamp = Math.max(...timestamps);

    const range = maxTimestamp - minTimestamp;
    const padding = range * 0.05;

    this.$xDomainMinimap.set([
      new Date(minTimestamp - padding),
      new Date(maxTimestamp + padding)
    ]);

    const values = allPoints.map(p => p.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valuePadding = (maxValue - minValue) * 0.1;

    this.$yDomainMinimap.set([
      minValue - valuePadding,
      maxValue + valuePadding
    ]);
  }

  readonly xScaleMinimap = linkedSignal({
    source: () => ({
      dimensions: {
        width: 200,
        height: 150
      },
      xDomain: this.$xDomainMinimap()
    }),
    computation: ({ dimensions, xDomain }) => {
      return d3ScaleUtc()
        .domain(xDomain)
        .range([0, dimensions.width]);
    }
  });

  readonly yScaleMinimap = linkedSignal({
    source: () => ({
      dimensions: this.$minimapDimensions(),
      yDomain: this.$yDomainMinimap(),
    }),
    computation: ({ dimensions, yDomain }) => {
      const { top, bottom } = this.margin;
      const height = dimensions.height - top - bottom;
      return d3ScaleLinear().domain(yDomain).range([height, 0]);
    },
  });

  readonly pathsMinimap = linkedSignal({
    source: () => ({
      xScale: this.xScaleMinimap(),
      yScale: this.yScaleMinimap(),
      series: this.dummySeries(),
      devices: this.dataSourceSelectionService.currentSource()?.id === 'omnaiscope'
        ? this.dataSourceSelectionService.omnaiDevices() || []
        : [],
    }),
    computation: ({ xScale, yScale, series, devices }) => {
      const lineGen = d3Line<{ time: Date; value: number }>()
        .x((d) => {
          const x = xScale(d.time);
          return x;
        })
        .y((d) => yScale(d.value));

      return Object.entries(series).map(([key, points]) => {
        const parsedValues = points.map(({ timestamp, value }) => ({
          time: new Date(timestamp),
          value,
        }));

        const pathData = lineGen(parsedValues) ?? '';
        const device = devices.find(d => d.UUID === key);
        const color = device ? `rgb(${device.color.r}, ${device.color.g}, ${device.color.b})` : 'steelblue';
        return {
          id: key,
          d: pathData,
          color: color,
        };
      });
    },
  });

  // Methode um Zoom zurückzusetzen, schauen wir mal wie das benutzt wird
  resetZoom() {
    this.$isZoomed.set(false);
    this.scaleAxisToData(this.dummySeries());
  }

  readonly paths = linkedSignal({
    source: () => ({
      xScale: this.xScale(),
      yScale: this.yScale(),
      series: this.dummySeries(),
      devices: this.dataSourceSelectionService.currentSource()?.id === 'omnaiscope'
        ? this.dataSourceSelectionService.omnaiDevices() || []
        : [],
    }),
    computation: ({ xScale, yScale, series, devices }) => {
      const lineGen = d3Line<{ time: Date; value: number }>()
        .x((d) => xScale(d.time))
        .y((d) => yScale(d.value));

      return Object.entries(series).map(([key, points]) => {
        const parsedValues = points.map(({ timestamp, value }) => ({
          time: new Date(timestamp),
          value,
        }));

        const pathData = lineGen(parsedValues) ?? '';
        const device = devices.find(d => d.UUID === key);
        const color = device ? `rgb(${device.color.r}, ${device.color.g}, ${device.color.b})` : 'steelblue';
        return {
          id: key,
          d: pathData,
          color: color,
        };
      });
    },
  });
}
