import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NavbarInicio } from './navbar-inicio';

describe('NavbarInicio', () => {
  let component: NavbarInicio;
  let fixture: ComponentFixture<NavbarInicio>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarInicio]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NavbarInicio);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
