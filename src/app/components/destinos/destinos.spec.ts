import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Destinos } from './destinos';

describe('Destinos', () => {
  let component: Destinos;
  let fixture: ComponentFixture<Destinos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Destinos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Destinos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
