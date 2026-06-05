import { Component, inject } from '@angular/core';
import { UsuarioService } from '../../../services/usuario';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [NgFor],
  templateUrl: './usuarios.html',
  styleUrls: ['./usuarios.css'],
})
export class UsuariosAdmin {
  protected readonly usuarioService = inject(UsuarioService);

}
