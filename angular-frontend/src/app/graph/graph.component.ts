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
  type ElementRef
} from '@angular/core';
import { line, transition } from 'd3';
import { axisBottom, axisLeft } from 'd3-axis';
import { select } from 'd3-selection';
import { DeviceListComponent } from "../omnai-datasource/omnai-scope-server/devicelist.component";
import { ResizeObserverDirective } from '../shared/resize-observer.directive';
import { StartDataButtonComponent } from "../source-selection/start-data-from-source.component";
import { DataSourceService } from './graph-data.service';
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
export class GraphComponent {
  readonly dataservice = inject(DataSourceService);
  readonly svgGraph = viewChild.required<ElementRef<SVGElement>>('graphContainer');
  readonly axesContainer = viewChild.required<ElementRef<SVGGElement>>('xAxis');
  readonly axesYContainer = viewChild.required<ElementRef<SVGGElement>>('yAxis');
  readonly gridContainer = viewChild.required<ElementRef<SVGGElement>>('grid');
  readonly guideContainer = viewChild.required<ElementRef<SVGGElement>>('guideline');
  readonly commentLayer = viewChild.required<ElementRef<SVGGElement>>('commentLayer');
  readonly fixedGuides = signal<number[]>([]);
  readonly comments = signal<GraphComment[]>([]);

  commentInputVisible = signal(false);
  commentInputPosition = signal({ x: 0, y: 0 });
  commentInputText = signal('');

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

  updateGraphDimensions(dimension: { width: number, height: number }) {
    this.dataservice.updateGraphDimensions(dimension);
  }

  onMouseMove(hover: MouseEvent) {
    const topOffset = ((hover.target as HTMLElement).closest("svg")!.getBoundingClientRect().top);
    const yaxis = this.dataservice.yScale();
    const botlimit = yaxis(0) + 20;
    const toplimit = yaxis(100) + 20;
    const ypos = Math.max(Math.min(hover.clientY - topOffset, botlimit), toplimit);

    const g = this.guideContainer().nativeElement;
    const container = select(g);

    const value = yaxis.invert(ypos - 20);
    const formatted = value.toFixed(1);

    container.selectAll("line.temporary")
      .data([ypos])
      .join("line")
      .attr("class", "temporary")
      .attr("stroke", "darkgray")
      .attr("stroke-opacity", 0.7)
      .attr("x1", 0)
      .attr("x2", "100%")
      .attr("y1", d => d - 20)
      .attr("y2", d => d - 20);

    container.selectAll("text.temporary")
      .data([ypos])
      .join("text")
      .attr("class", "temporary")
      .attr("x", 5)
      .attr("y", d => d - 25)
      .attr("fill", "black")
      .attr("font-size", "12px")
      .attr("font-family", "sans-serif")
      .text(formatted);
  }

  onClick(event: MouseEvent) {
    const topOffset = ((event.target as HTMLElement).closest("svg")!.getBoundingClientRect().top);
    const yaxis = this.dataservice.yScale();
    const botlimit = yaxis(0) + 20;
    const toplimit = yaxis(100) + 20;
    const ypos = Math.max(Math.min(event.clientY - topOffset, botlimit), toplimit);

    this.fixedGuides.update(lines => [...lines, ypos]);
    this.drawFixedLines();
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
    const lines = this.fixedGuides();
    const yaxis = this.dataservice.yScale();
  
    select(g).selectAll("line.fixed").remove();
    select(g)
      .selectAll("line.fixed")
      .data(lines)
      .join("line")
      .attr("class", "fixed")
      .attr("stroke", "red")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "2,2")
      .attr("x1", 0)
      .attr("x2", "100%")
      .attr("y1", d => d - 20)
      .attr("y2", d => d - 20);
  
    select(g).selectAll("text.fixed").remove();
    select(g)
      .selectAll("text.fixed")
      .data(lines)
      .join("text")
      .attr("class", "fixed")
      .attr("x", 5)
      .attr("y", d => d - 25)
      .attr("fill", "red")
      .attr("font-size", "12px")
      .attr("font-family", "sans-serif")
      .text(d => yaxis.invert(d - 20).toFixed(1));
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

    // vertical grid
    // .call(g => g.append("g")
    //       .selectAll("line")
    //       .data(x.ticks())
    //       .join("line")
    //         .attr("x1", d => 0.5 + x(d))
    //         .attr("x2", d => 0.5 + x(d))
    //         .attr("y1", 0)
    //         .attr("y2", 100))
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

    onCleanUp(() => g.innerHTML = "");
  });
}

// drawGrid() {
//   const g = this.gridContainer().nativeElement;
//   const x = this.dataservice.xScale();
//   const y = this.dataservice.yScale();

//   select(g).attr("stroke", "lightgray").attr("stroke-opacity", 0.7);

//    // vertical grid
//   // .call(g => g.append("g")
//   //       .selectAll("line")
//   //       .data(x.ticks())
//   //       .join("line")
//   //         .attr("x1", d => 0.5 + x(d))
//   //         .attr("x2", d => 0.5 + x(d))
//   //         .attr("y1", 0)
//   //         .attr("y2", 100))
//   // horizontale Linien
//   select(g)
//     .append("g")
//     .attr("class", "horizontal-grid")
//     .selectAll("line")
//     .data(y.ticks())
//     .join("line")
//     .attr("y1", d => 0.5 + y(d))
//     .attr("y2", d => 0.5 + y(d))
//     .attr("x1", 0)
//     .attr("x2", "100%");
// }

// clearGrid() {
//   this.gridContainer().nativeElement.innerHTML = '';
// }
