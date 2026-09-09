import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Fooster } from './fooster';

describe('Fooster', () => {
  let component: Fooster;
  let fixture: ComponentFixture<Fooster>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Fooster],
    }).compileComponents();

    fixture = TestBed.createComponent(Fooster);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
