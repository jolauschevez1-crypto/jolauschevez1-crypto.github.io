import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Misreservas } from './misreservas';

describe('Misreservas', () => {
  let component: Misreservas;
  let fixture: ComponentFixture<Misreservas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Misreservas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Misreservas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
