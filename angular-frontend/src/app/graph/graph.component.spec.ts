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

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GraphComponent } from './graph.component';

import { DataSourceService } from './graph-data.service';

describe('GraphComponent', () => {
  let component: GraphComponent;
  let fixture: ComponentFixture<GraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GraphComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
      .compileComponents();

    fixture = TestBed.createComponent(GraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should submit a comment', () => {
    component.comments.set([]);
    component.commentInputText.set('Testkommentar');
    component.submitComment();

    const lastComment = component.comments().at(-1);
    expect(lastComment?.text).toBe('Testkommentar');
    expect(component.commentInputVisible()).toBeFalse();
  });

  it('should cancel comment input', () => {
    component.commentInputText.set('Abbrechen');
    component.commentInputVisible.set(true);
    component.cancelComment();
    expect(component.commentInputVisible()).toBeFalse();
    expect(component.commentInputText()).toBe('');
  });

  it('should not submit empty comment', () => {
    component.comments.set([]);
    component.commentInputText.set('');
    component.submitComment();

    expect(component.comments().length).toBe(0);
  });

  it('should remove hovered guide on Backspace', () => {
    const fixture = TestBed.createComponent(GraphComponent);
    const component = fixture.componentInstance;

    component.fixedGuides.set([10, 20]);
    component.hoveredGuide.set(10);

    const event = new KeyboardEvent('keydown', { key: 'Backspace' });
    const preventSpy = spyOn(event, 'preventDefault');

    component.onKeyDown(event);

    expect(component.fixedGuides()).toEqual([20]);
    expect(component.hoveredGuide()).toBeNull();
    expect(preventSpy).toHaveBeenCalled();
  });

  it('should call dataservice.updateGraphDimensions', () => {
    const fixture = TestBed.createComponent(GraphComponent);
    const component = fixture.componentInstance;

    const spy = spyOn(component['dataservice'], 'updateGraphDimensions');
    component.updateGraphDimensions({ width: 100, height: 200 });

    expect(spy).toHaveBeenCalledWith({ width: 100, height: 200 });
  });

  it('should return the correct default viewBox', () => {
    const fixture = TestBed.createComponent(GraphComponent);
    const component = fixture.componentInstance;

    component['fullWidth'] = 800;
    component['fullHeight'] = 600;

    expect(component.defaultViewBox).toEqual({
      x: 0,
      y: 0,
      width: 800,
      height: 600
    });
  });
});
