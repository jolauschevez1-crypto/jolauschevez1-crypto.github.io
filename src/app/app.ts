import { Component } from '@angular/core';
import { NavbarInicio } from './components/navbar-inicio/navbar-inicio';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NavbarInicio],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {}
