import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Tuors } from './tuors';

describe('Tuors', () => {
  let component: Tuors;
  let fixture: ComponentFixture<Tuors>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tuors]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Tuors);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
