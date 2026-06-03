import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Detalletour } from './detalletour';

describe('Detalletour', () => {
  let component: Detalletour;
  let fixture: ComponentFixture<Detalletour>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Detalletour]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Detalletour);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
