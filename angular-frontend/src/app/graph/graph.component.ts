import { isPlatformBrowser, JsonPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  PLATFORM_ID,
  signal,
  viewChild,
  ViewChild,
  type ElementRef,
  AfterViewInit
} from '@angular/core';
import { axisBottom, axisLeft } from 'd3-axis';
import { select } from 'd3-selection';
import { DeviceListComponent } from "../omnai-datasource/omnai-scope-server/devicelist.component";
import { ResizeObserverDirective } from '../shared/resize-observer.directive';
import { StartDataButtonComponent } from "../source-selection/start-data-from-source.component";
import { DataSourceService } from './graph-data.service';
import { transition } from 'd3-transition';
import { zoomIdentity, ZoomTransform } from 'd3-zoom';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as d3 from 'd3'

interface GraphComment {
  x: number;
  y: number;
  text: string;
}

@Component({
  selector: 'app-graph',
  standalone: true,
  templateUrl: './graph.component.html',
  providers: [DataSourceService],
  styleUrls: ['./graph.component.css'],
  imports: [CommonModule, ResizeObserverDirective, JsonPipe, FormsModule, StartDataButtonComponent, DeviceListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GraphComponent implements AfterViewInit {
  @ViewChild('graphContainer', { static: true })
  graphEl!: ElementRef<SVGSVGElement>;

  readonly dataservice = inject(DataSourceService);
  readonly svgGraph = viewChild.required<ElementRef<SVGElement>>('graphContainer');
  readonly axesContainer = viewChild.required<ElementRef<SVGGElement>>('xAxis');
  readonly axesYContainer = viewChild.required<ElementRef<SVGGElement>>('yAxis');
  readonly gridContainer = viewChild.required<ElementRef<SVGGElement>>('grid');
  readonly guideContainer = viewChild.required<ElementRef<SVGGElement>>('guideline');
  readonly commentLayer = viewChild.required<ElementRef<SVGGElement>>('commentLayer');
  readonly fixedGuides = signal<number[]>([]);
  readonly fixedXGuides = signal<number[]>([]);
  readonly comments = signal<GraphComment[]>([]);
  readonly syncMinimapViewport = effect(() => {
    this.zoomWindowInMinimap();
  });
  readonly zoomWindowInMinimap = computed(() => {
    const mainXScale = this.dataservice.xScale();
    const mainYScale = this.dataservice.yScale();
    const miniXScale = this.dataservice.xScaleMinimap();
    const miniYScale = this.dataservice.yScaleMinimap();

    const [x0, x1] = mainXScale.domain();
    const [y0, y1] = mainYScale.domain();

    return {
      x: miniXScale(x0),
      y: miniYScale(y1),
      width: miniXScale(x1) - miniXScale(x0),
      height: miniYScale(y0) - miniYScale(y1)
    };
  });

  readonly minimapTransform = computed(() => {
    const scaleX = this.minimapWidth / this.fullWidth;
    const scaleY = this.minimapHeight / this.fullHeight;
    const xTranslate = this.dataservice.margin.left * scaleX;
    const yTranslate = this.dataservice.margin.top * scaleY;
    return `translate(${xTranslate}, ${yTranslate})`;
  });

  readonly minimapPaths = computed(() => {
    const paths = this.dataservice.pathsMinimap();
    const xScale = this.dataservice.xScaleMinimap();
    const yScale = this.dataservice.yScaleMinimap();

    if (paths.length > 0) {
      console.log('First path x-range:', {
        min: xScale.invert(0),
        max: xScale.invert(this.minimapWidth)
      });
    }

    return paths;
  });

  readonly viewportRect = computed(() => {
    const mainXScale = this.dataservice.xScale();
    const mainYScale = this.dataservice.yScale();
    const miniXScale = this.dataservice.xScaleMinimap();
    const miniYScale = this.dataservice.yScaleMinimap();

    const [x0, x1] = mainXScale.domain();
    const [y0, y1] = mainYScale.domain();

    return {
      x: miniXScale(x0),
      y: miniYScale(y1),
      width: miniXScale(x1) - miniXScale(x0),
      height: miniYScale(y0) - miniYScale(y1)
    };
  });

  readonly currentViewBox = signal({ x: 0, y: 0, width: 500, height: 250 });
  get defaultViewBox() {
    return {
      x: 0,
      y: 0,
      width: this.fullWidth,
      height: this.fullHeight,
    };
  }

  get minimapXScale() {
    return d3.scaleLinear()
      .domain([0, this.fullWidth])
      .range([0, this.minimapWidth]);
  }

  get minimapYScale() {
    return d3.scaleLinear()
      .domain([0, this.fullHeight])
      .range([0, this.minimapHeight]);
  }

  hoveredGuide = signal<number | null>(null);

  commentInputVisible = signal(false);
  commentInputPosition = signal({ x: 0, y: 0 });
  commentInputText = signal('')

  hasZoomed = false;

  private readonly platform = inject(PLATFORM_ID);
  isInBrowser = isPlatformBrowser(this.platform);

  constructor() {
    if (this.isInBrowser) {
      queueMicrotask(() => {
        const rect = this.svgGraph().nativeElement.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          this.dataservice.updateGraphDimensions({ width: rect.width, height: rect.height });
        }
      });
    }
  }

  private initKeyboardPan() {
    window.addEventListener('keydown', (event) => {
      const step = 0.05;

      const xScale = this.dataservice.xScale();
      const yScale = this.dataservice.yScale();
      const [x0, x1] = xScale.domain().map(d => d.getTime());
      const [y0, y1] = yScale.domain();

      const xRange = x1 - x0;
      const yRange = y1 - y0;

      let dx = 0, dy = 0;

      switch (event.key) {
        case 'ArrowLeft': dx = -step * xRange; break;
        case 'ArrowRight': dx = step * xRange; break;
        case 'ArrowDown': dy = -step * yRange; break;
        case 'ArrowUp': dy = step * yRange; break;
        default: return;
      }

      this.dataservice.setDomains(
        [new Date(x0 + dx), new Date(x1 + dx)],
        [y0 + dy, y1 + dy]
      );
    });
  }

  currentTransform: ZoomTransform = zoomIdentity;
  ngAfterViewInit(): void {
    if (this.isInBrowser) {
      this.initZoom();
      this.initKeyboardPan();
      setTimeout(() => {
        this.graphEl.nativeElement.focus();
      });

      effect(() => {
        const xScale = this.dataservice.xScaleMinimap();
        console.log('Minimap X-Scale:', {
          domain: xScale.domain().map(d => d.toString()),
          range: xScale.range()
        });

        const paths = this.dataservice.pathsMinimap();
        if (paths.length > 0) {
          const points = paths[0].d.match(/(\d+\.?\d*)/g);
          if (points && points.length >= 4) {
            console.log('First point coordinates:', {
              x: points[0],
              y: points[1]
            });
          }
        }
      });
    }
  }

  private initZoom() {
    const svgRef = this.svgGraph();
    if (!svgRef) {
      console.warn("SVG-Element nicht verfügbar");
      return;
    }

    const svgElement = svgRef.nativeElement;
    svgElement.addEventListener("wheel", this.onWheel.bind(this), { passive: false });
  }

  onMiniMapClick(event: MouseEvent) {
    const minimapSvg = (event.target as SVGElement).closest('svg.minimap');
    if (!minimapSvg) return;

    const rect = minimapSvg.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const miniXScale = this.dataservice.xScaleMinimap();
    const miniYScale = this.dataservice.yScaleMinimap();

    const dataX = miniXScale.invert(clickX);
    const dataY = miniYScale.invert(clickY);

    const currentXDomain = this.dataservice.xScale().domain();
    const currentYDomain = this.dataservice.yScale().domain();
    const xRange = currentXDomain[1].getTime() - currentXDomain[0].getTime();
    const yRange = currentYDomain[1] - currentYDomain[0];

    const newXDomain: [Date, Date] = [
      new Date(dataX.getTime() - xRange / 2),
      new Date(dataX.getTime() + xRange / 2)
    ];

    const newYDomain: [number, number] = [
      dataY - yRange / 2,
      dataY + yRange / 2
    ];

    this.dataservice.setDomains(newXDomain, newYDomain);
  }

  onWheel(event: WheelEvent): void {
    if (!this.isInBrowser) return;
    event.preventDefault();

    const svgElement = this.svgGraph().nativeElement;
    const { left, top } = svgElement.getBoundingClientRect();
    const svgX = event.clientX - left;
    const svgY = event.clientY - top;

    const xScale = this.dataservice.xScale();
    const yScale = this.dataservice.yScale();

    const [x0, x1] = xScale.domain().map(d => d.getTime());
    const [y0, y1] = yScale.domain();
    const margin = this.dataservice.margin;
    const mouseX = svgX - margin.left;
    const mouseY = svgY - margin.top;

    const xValueUnderMouse = xScale.invert(mouseX).getTime();
    const yValueUnderMouse = yScale.invert(mouseY);

    const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;

    const newX0 = xValueUnderMouse + (x0 - xValueUnderMouse) * zoomFactor;
    const newX1 = xValueUnderMouse + (x1 - xValueUnderMouse) * zoomFactor;

    const newY0 = yValueUnderMouse + (y0 - yValueUnderMouse) * zoomFactor;
    const newY1 = yValueUnderMouse + (y1 - yValueUnderMouse) * zoomFactor;

    this.dataservice.setDomains(
      [new Date(newX0), new Date(newX1)],
      [newY0, newY1]
    );

    const baseX = this.dataservice.xScale();
    const baseY = this.dataservice.yScale();

    const newXScale = this.dataservice.xScale();
    const newYScale = this.dataservice.yScale();

    if (!this.hasZoomed) {
      this.hasZoomed = true;
    }

    this.currentTransform = zoomIdentity
      .scale((newX1 - newX0) / (x1 - x0))
      .translate(
        -newX0 / ((newX1 - newX0) / (x1 - x0)), 0
      );

    this.drawFixedLines();
  }

  updateGraphDimensions(dimension: { width: number, height: number }) {
    this.dataservice.updateGraphDimensions(dimension);
  }

  onMouseMove(hover: MouseEvent) {
    const svgRect = (hover.target as HTMLElement).closest("svg")!.getBoundingClientRect();
    const topOffset = svgRect.top;
    const leftOffset = svgRect.left;

    const xaxis = this.dataservice.xScale();
    const yaxis = this.dataservice.yScale();
    const margin = this.dataservice.margin;

    const mouseX = hover.clientX - leftOffset - margin.left;
    const mouseY = hover.clientY - topOffset - margin.top;

    const ypos = Math.max(Math.min(mouseY, yaxis.range()[0]), yaxis.range()[1]);
    const xpos = Math.max(Math.min(mouseX, xaxis.range()[1]), xaxis.range()[0]);

    const g = this.guideContainer().nativeElement;
    const container = select(g);

    const yValue = yaxis.invert(ypos);
    const xValue = xaxis.invert(xpos);

    container.selectAll("line.temporary").remove();
    container.selectAll("text.temporary").remove();

    // Horizontale Linie + Label
    container.append("line")
      .attr("class", "temporary")
      .attr("stroke", "darkgray")
      .attr("stroke-opacity", 0.7)
      .attr("x1", 0)
      .attr("x2", "100%")
      .attr("y1", ypos)
      .attr("y2", ypos);

    container.append("text")
      .attr("class", "temporary")
      .attr("x", 5)
      .attr("y", ypos - 5)
      .attr("fill", "black")
      .attr("font-size", "12px")
      .attr("font-family", "sans-serif")
      .text(yValue.toFixed(1));

    // // Vertikale Linie (+ Label) wenn es funktionieren würde
    // lines -> copy above and swap out x and y

    // container.append("text")
    //   .attr("class", "temporary")
    //   .attr("x", xpos + 5)
    //   .attr("y", 12)
    //   .attr("fill", "black")
    //   .attr("font-size", "12px")
    //   .attr("font-family", "sans-serif")
    //   //.text(yValue.toFixed(1))
    //   ;
  }

  onClick(event: MouseEvent) {
    const svgRect = (event.target as HTMLElement).closest("svg")!.getBoundingClientRect();
    const xaxis = this.dataservice.xScale();
    const yaxis = this.dataservice.yScale();
    const margin = this.dataservice.margin;

    const svgX = event.clientX - svgRect.left;
    const svgY = event.clientY - svgRect.top;

    const xDataValue = xaxis.invert(svgX - margin.left).getTime();
    const yDataValue = yaxis.invert(svgY - margin.top);

    this.fixedGuides.update(lines => [...lines, yDataValue]);
    this.fixedXGuides.update(lines => [...lines, xDataValue]);

    this.drawFixedLines();
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Backspace') {
      const y = this.hoveredGuide();
      if (y !== null) {
        this.fixedGuides.update(lines => lines.filter(val => val !== y));
        this.hoveredGuide.set(null);
      }
      event.preventDefault();
    }
  }

  onRightClick(event: MouseEvent) {
    event.preventDefault();

    const svg = (event.target as HTMLElement).closest("svg")!;
    const rect = svg.getBoundingClientRect();

    const x = event.clientX - rect.left - this.dataservice.margin.left;
    const y = event.clientY - rect.top - this.dataservice.margin.top;

    this.commentInputPosition.set({ x, y });
    this.commentInputText.set('');
    this.commentInputVisible.set(true);
  }

  private addComment(x: number, y: number, text: string): void {
    const layer = d3.select(this.commentLayer().nativeElement);

    const group = layer
      .append('g')
      .attr('transform', `translate(${x},${y})`)
      .call(
        d3.drag<SVGGElement, unknown>()
          .on('drag', function (event) {
            d3.select(this).attr('transform', `translate(${event.x},${event.y})`);
          })
      );

    group.on('click', function (event) {
      event.stopPropagation();
    });

    const tempText = group
      .append('text')
      .attr('class', 'comment-text')
      .attr('x', 10)
      .attr('y', 25)
      .attr('font-size', '14px')
      .attr('fill', '#333')
      .attr('font-family', "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif")
      .attr('font-weight', '500')
      .attr('dominant-baseline', 'hanging')
      .attr('text-anchor', 'start')
      .text(text)
      .call(wrapText, 160);

    const tspans = tempText.selectAll('tspan').nodes();
    const lineCount = tspans.length;
    const lineHeightPx = 18;
    const verticalPadding = 25;
    const rectHeight = lineCount * lineHeightPx + verticalPadding;
    const rectWidth = 180;

    tempText.remove();

    const textElement = group
      .append('text')
      .attr('class', 'comment-text')
      .attr('data-full-text', text)
      .attr('x', 10)
      .attr('y', 22)
      .attr('font-size', '14px')
      .attr('fill', '#222')
      .attr('font-family', "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif")
      .attr('font-weight', '500')
      .attr('dominant-baseline', 'hanging')
      .attr('text-anchor', 'start');

    textElement.on('dblclick', function (event) {
      event.stopPropagation();
      const textEl = d3.select(this);
      const currentText = textEl.attr('data-full-text') || textEl.text();
      const parent = d3.select<SVGGElement, unknown>(this.parentNode as SVGGElement);
      const rect = parent.select('rect');
      const width = parseFloat(rect.attr('width')) - 20;
      const height = parseFloat(rect.attr('height'));

      textEl.style('display', 'none');

      const fo = parent.append('foreignObject')
        .attr('x', 10)
        .attr('y', 10)
        .attr('width', width)
        .attr('height', height - 20);

      const foBody = fo.append('xhtml:div')
        .style('width', '100%')
        .style('height', '100%');

      const textarea = foBody.append('textarea')
        .style('width', '100%')
        .style('height', '100%')
        .style('font-size', '14px')
        .style('font-family', "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif")
        .style('box-sizing', 'border-box')
        .text(currentText)
        .on('blur', function () {
          const newText = (this as HTMLTextAreaElement).value;
          textEl
            .text(newText)
            .attr('data-full-text', newText)
            .style('display', null);

          fo.remove();

          const padding = 20;
          const newWidth = parseFloat(rect.attr('width')) - padding;

          wrapText(textEl, newWidth);

          const tspans = textEl.selectAll('tspan').nodes();
          const lineCount = tspans.length;
          const lineHeight = 18;
          const verticalPadding = 25;
          const newHeight = lineCount * lineHeight + verticalPadding;

          rect.attr('height', newHeight);

          parent.select<SVGTextElement>('.resize-handle')
            .attr('y', newHeight - 6);

          parent.select<SVGTextElement>('.coord-text')
            .attr('y', newHeight - 6);
        })
        .on('keydown', function (event) {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            (this as HTMLTextAreaElement).blur();
          }
        });

      textarea.node()?.focus();
    });

    requestAnimationFrame(() => {
      textElement.text(text);
      wrapText(textElement, rectWidth - 20);
    });

    group
      .insert('rect', 'text')
      .attr('width', rectWidth)
      .attr('height', rectHeight)
      .attr('fill', '#fff')
      .attr('stroke', '#c8c8c8')
      .attr('stroke-width', 1.2)
      .attr('rx', 8)
      .attr('ry', 8)
      .style('filter', 'drop-shadow(0 1px 3px rgba(0,0,0,0.15))');

    group.select('text')
      .attr('font-family', "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif")
      .attr('font-weight', '500')
      .attr('fill', '#333');

    const closeButton = group
      .append('text')
      .attr('class', 'close-button')
      .attr('x', rectWidth - 16)
      .attr('y', 14)
      .text('✖')
      .attr('font-size', '16px')
      .attr('fill', '#999')
      .attr('cursor', 'pointer')
      .on('mouseover', function () {
        d3.select(this).attr('fill', '#333');
      })
      .on('mouseout', function () {
        d3.select(this).attr('fill', '#999');
      })
      .on('click', function () {
        group.remove();
      });

    const minimizeButton = group.append('text')
      .attr('class', 'minimize-button')
      .attr('x', rectWidth - 32)
      .attr('y', 14)
      .text('−')
      .attr('font-size', '16px')
      .attr('fill', '#555')
      .attr('cursor', 'pointer')
      .on('mouseover', function () {
        d3.select(this).attr('fill', '#000');
      })
      .on('mouseout', function () {
        d3.select(this).attr('fill', '#555');
      })
      .on('click', function (event) {
        event.stopPropagation();
        group.attr('data-minimized', 'true');
        group.selectAll('text.comment-text,.close-button,.resize-handle,.minimize-button, rect').style('display', 'none');
        group.append('text')
          .attr('class', 'restore-button')
          .attr('x', rectWidth / 2 - 5)
          .attr('y', 20)
          .text('+')
          .attr('font-size', '20px')
          .attr('fill', '#007BFF')
          .attr('cursor', 'pointer')
          .on('click', function (event) {
            event.stopPropagation();
            group.attr('data-minimized', 'false');
            group.selectAll('text.comment-text,.close-button,.resize-handle,.minimize-button, rect').style('display', null);
            group.select('.restore-button').remove();
          });
      });

    const resizeHandle = group
      .append('text')
      .attr('class', 'resize-handle')
      .attr('x', rectWidth - 16)
      .attr('y', rectHeight - 6)
      .text('⤡')
      .attr('font-size', '14px')
      .attr('fill', '#666')
      .attr('cursor', 'nwse-resize')
      .on('mouseover', function () {
        d3.select(this).attr('fill', '#000');
      })
      .on('mouseout', function () {
        d3.select(this).attr('fill', '#666');
      })
      .call(
        d3.drag<SVGTextElement, unknown>()
          .on('drag', function (event) {
            const minPadding = 20;

            const text = group.select<SVGTextElement>('.comment-text');
            const originalText = text.attr('data-full-text');

            const testText = text.clone(true)
              .style('visibility', 'hidden')
              .style('pointer-events', 'none')
              .text(originalText)
              .call(wrapText, event.x - minPadding);

            const bbox = testText.node()?.getBBox();
            const requiredWidth = (bbox?.width ?? 60) + minPadding;
            const requiredHeight = (bbox?.height ?? 30) + verticalPadding;
            testText.remove();

            const newWidth = Math.max(60, event.x, requiredWidth);
            const newHeight = Math.max(30, event.y, requiredHeight);

            group.select('rect')
              .attr('width', newWidth)
              .attr('height', newHeight);

            group.select('.resize-handle')
              .attr('x', newWidth - 16)
              .attr('y', newHeight - 6);

            group.select('.close-button')
              .attr('x', newWidth - 16);

            group.select('.minimize-button')
              .attr('x', newWidth - 32);

            text.text(originalText);
            wrapText(text, newWidth - minPadding);

            group.select('.coord-text')
              .attr('y', newHeight - 6);
          })
      );

    function wrapText(textSelection: d3.Selection<SVGTextElement, unknown, null, undefined>, width: number) {
      textSelection.each(function () {
        const text = d3.select(this);
        const words = text.text().split(/\s+/).reverse();
        let word: string;
        let line: string[] = [];
        let lineNumber = 0;
        const lineHeight = 1.2;
        const x = text.attr('x');
        const y = text.attr('y');
        const dy = 0;
        let tspan = text.text(null)
          .append('tspan')
          .attr('x', x)
          .attr('y', y)
          .attr('dy', `${dy}em`)
          .text('');

        while ((word = words.pop()!)) {
          line.push(word);
          tspan.text(line.join(' '));
          if (tspan.node()!.getComputedTextLength() > width) {
            line.pop();
            tspan.text(line.join(' '));
            line = [word];
            tspan = text.append('tspan')
              .attr('x', x)
              .attr('y', y)
              .attr('dy', `${++lineNumber * lineHeight}em`)
              .text(word);
          }
        }
      });
    }
  }

  submitComment() {
    const { x, y } = this.commentInputPosition();
    const text = this.commentInputText().trim();

    if (!text) return;

    this.comments.update(c => [...c, { x, y, text }]);
    this.addComment(x, y, text);
    this.commentInputVisible.set(false);
  }

  cancelComment() {
    this.commentInputVisible.set(false);
    this.commentInputText.set('');
  }

  drawFixedLines() {
    const g = this.guideContainer().nativeElement;
    const xaxis = this.dataservice.xScale();
    const yaxis = this.dataservice.yScale();

    const visibleHeight = yaxis.range();
    const visibleWidth = xaxis.range();

    const visibleYGuides = this.fixedGuides().filter(d => {
      const yPos = yaxis(d);
      return yPos >= visibleHeight[1] && yPos <= visibleHeight[0];
    });

    const visibleXGuides = this.fixedXGuides().filter(d => {
      const xPos = xaxis(new Date(d));
      return xPos >= visibleWidth[0] && xPos <= visibleWidth[1];
    });

    const container = select(g);
    container.selectAll("line.fixed").remove();
    container.selectAll("text.fixed").remove();

    container
      .selectAll("text.fixed-h")
      .data(visibleYGuides)
      .join("text")
      .attr("class", "fixed fixed-h")
      .attr("pointer-events", "none")
      .attr("x", 5)
      .attr("y", d => yaxis(d) - 5)
      .attr("fill", "crimson")
      .attr("font-size", "12px")
      .text(d => d.toFixed(1));

    // Vertikale Linien
    // container
    //   .selectAll("line.fixed-v")
    //   .data(visibleXGuides)
    //   .join("line")
    //   .attr("class", "fixed fixed-v")
    //   .attr("stroke", "blue")
    //   .attr("stroke-width", 1)
    //   .attr("stroke-dasharray", "2,2")
    //   .attr("x1", d => xaxis(new Date(d)))
    //   .attr("x2", d => xaxis(new Date(d)))
    //   .attr("y1", 0)
    //   .attr("y2", "100%");

    // container
    //   .selectAll("text.fixed-v")
    //   .data(visibleXGuides)
    //   .join("text")
    //   .attr("class", "fixed fixed-v")
    //   .attr("x", d => xaxis(new Date(d)) + 5)
    //   .attr("y", 12)
    //   .attr("fill", "blue")
    //   .attr("font-size", "12px")
    //   .text(d => new Date(d).toLocaleTimeString());
  }

  marginTransform = computed(() => {
    return `translate(${this.dataservice.margin.left}, ${this.dataservice.margin.top})`;
  });

  xAxisTransformString = computed(() => {
    const yScale = this.dataservice.yScale();
    return `translate(0, ${yScale.range()[0]})`;
  });

  yAxisTransformString = computed(() => {
    const xScale = this.dataservice.xScale();
    return `translate(${xScale.range()[0]}, 0)`;
  });

  updateXAxisInCanvas = effect(() => {
    if (!this.isInBrowser) return;
    const x = this.dataservice.xScale();
    const g = this.axesContainer().nativeElement;
    select(g).transition(transition()).duration(300).call(axisBottom(x));
  });

  updateYAxisInCanvas = effect(() => {
    if (!this.isInBrowser) return;
    const y = this.dataservice.yScale();
    const g = this.axesYContainer().nativeElement;
    select(g).transition(transition()).duration(300).call(axisLeft(y));
  });

  updateGridInCanvas = effect((onCleanUp) => {
    if (!this.isInBrowser) return;
    const x = this.dataservice.xScale();
    const y = this.dataservice.yScale();
    const g = this.gridContainer().nativeElement;

    select(g).attr("stroke", "lightgray").attr("stroke-opacity", 0.7);

    // Horizontale Linien
    select(g)
      .append("g")
      .attr("class", "horizontal-grid")
      .selectAll("line")
      .data(y.ticks())
      .join("line")
      .attr("y1", d => 0.5 + y(d))
      .attr("y2", d => 0.5 + y(d))
      .attr("x1", 0)
      .attr("x2", "100%");

    // Vertikale Linien
    // copy above and swap x with y + it's the vertical grid 

    onCleanUp(() => g.innerHTML = "");
  });

  readonly updateGuidelines = effect(() => {
    if (!this.isInBrowser) return;
    this.fixedGuides();
    this.fixedXGuides();
    this.drawFixedLines();
  });

  resetZoom() {
    console.log("Reset Zoom aufgerufen");
    this.dataservice.resetZoom();
    this.hasZoomed = false;
  }

  minimapWidth = 210;
  minimapHeight = 140;
  fullWidth = window.screen.availWidth;
  fullHeight = window.screen.availHeight;

  get viewRectX() {
    return this.minimapXScale(this.currentViewBox().x);
  }

  get viewRectY() {
    return this.minimapYScale(this.currentViewBox().y);
  }

  get viewRectWidth() {
    return this.minimapXScale(this.currentViewBox().width) - this.minimapXScale(0);
  }

  get viewRectHeight() {
    return this.minimapYScale(this.currentViewBox().height) - this.minimapYScale(0);
  }

  setViewportAround(centerX: number, centerY: number) {
    const view = this.currentViewBox();

    const viewWidth = view.width;
    const viewHeight = view.height;

    let newX = centerX - viewWidth / 2;
    let newY = centerY - viewHeight / 2;

    newX = Math.max(0, Math.min(newX, this.fullWidth - viewWidth));
    newY = Math.max(0, Math.min(newY, this.fullHeight - viewHeight));

    this.currentViewBox.set({
      x: newX,
      y: newY,
      width: viewWidth,
      height: viewHeight
    });
  }
}