import {
  CommonModule,
} from '@angular/common';

import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';

import {
  FormsModule,
} from '@angular/forms';

import {
  AdminService,
  UsuarioAdmin,
} from '../../../services/admin';

interface FormUsuario {
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  password: string;
  activo: boolean;
}

@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
  ],
  templateUrl: './usuarios.html',
  styleUrls: [
    './usuarios.css',
  ],
})
export class UsuariosAdmin implements OnInit {
  private readonly adminService =
    inject(AdminService);

  protected readonly usuarios =
    signal<UsuarioAdmin[]>([]);

  protected readonly cargando =
    signal(true);

  protected readonly procesandoRolId =
    signal<number | null>(null);

  protected readonly error =
    signal('');

  protected readonly mensaje =
    signal('');

  protected mostrarFormulario =
    false;

  protected editandoId:
    number | null = null;

  protected formulario:
    FormUsuario = this.vacio();

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    this.adminService
      .listarUsuarios()
      .subscribe({
        next: (respuesta) => {
          this.usuarios.set(
            respuesta.usuarios || [],
          );

          this.cargando.set(false);
        },

        error: (error) => {
          this.cargando.set(false);

          this.error.set(
            this.adminService.mensajeError(
              error,
              'No se pudieron cargar los usuarios',
            ),
          );
        },
      });
  }

  protected nuevo(): void {
    this.error.set('');
    this.mensaje.set('');

    this.editandoId = null;
    this.formulario = this.vacio();
    this.mostrarFormulario = true;
  }

  protected editar(
    usuario: UsuarioAdmin,
  ): void {
    this.error.set('');
    this.mensaje.set('');

    this.editandoId =
      usuario.id_usuario;

    this.formulario = {
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      correo: usuario.correo,
      telefono:
        usuario.telefono || '',
      password: '',
      activo: usuario.activo,
    };

    this.mostrarFormulario = true;
  }

  protected guardar(): void {
    this.error.set('');
    this.mensaje.set('');

    if (
      !this.formulario.nombre.trim() ||
      !this.formulario.apellido.trim() ||
      !this.formulario.correo.trim()
    ) {
      this.error.set(
        'Completa los campos obligatorios',
      );

      return;
    }

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(this.formulario.correo.trim())) {
      this.error.set(
        'El correo electrónico no es válido',
      );

      return;
    }

    const telefonoRegex =
      /^[0-9]{10}$/;

    if (
      this.formulario.telefono.trim() &&
      !telefonoRegex.test(this.formulario.telefono.trim())
    ) {
      this.error.set(
        'El teléfono debe tener exactamente 10 números, sin espacios ni guiones',
      );

      return;
    }

    // La contraseña es obligatoria al crear, y opcional al editar
    // (si se deja vacía, el backend conserva la contraseña actual).
    const debeValidarPassword =
      !this.editandoId ||
      this.formulario.password.length > 0;

    if (debeValidarPassword) {
      const password = this.formulario.password;

      if (password.length < 8) {
        this.error.set(
          'La contraseña debe tener mínimo 8 caracteres',
        );

        return;
      }

      if (!/[A-Z]/.test(password)) {
        this.error.set(
          'La contraseña debe contener una mayúscula',
        );

        return;
      }

      if (!/[a-z]/.test(password)) {
        this.error.set(
          'La contraseña debe contener una minúscula',
        );

        return;
      }

      if (!/[0-9]/.test(password)) {
        this.error.set(
          'La contraseña debe contener un número',
        );

        return;
      }

      if (!/[^A-Za-z0-9]/.test(password)) {
        this.error.set(
          'La contraseña debe contener un carácter especial',
        );

        return;
      }
    }

    const peticion =
      this.editandoId
        ? this.adminService
            .actualizarUsuario(
              this.editandoId,
              this.formulario,
            )
        : this.adminService
            .crearUsuario(
              this.formulario,
            );

    peticion.subscribe({
      next: (respuesta) => {
        this.mensaje.set(
          respuesta.mensaje,
        );

        this.mostrarFormulario =
          false;

        this.editandoId = null;
        this.cargar();
      },

      error: (error) => {
        this.error.set(
          this.adminService.mensajeError(
            error,
            'No se pudo guardar el usuario',
          ),
        );
      },
    });
  }

  protected cambiarRol(
    usuario: UsuarioAdmin,
  ): void {
    this.error.set('');
    this.mensaje.set('');

    if (usuario.es_admin_actual) {
      this.error.set(
        'No puedes cambiar tu propio rol desde esta pantalla',
      );

      return;
    }

    const nuevoRol:
      'user' | 'admin' =
      usuario.rol === 'admin'
        ? 'user'
        : 'admin';

    if (
      nuevoRol === 'admin' &&
      !usuario.activo
    ) {
      this.error.set(
        'Activa al usuario antes de convertirlo en administrador',
      );

      return;
    }

    const nombreCompleto =
      `${usuario.nombre} ${usuario.apellido}`
        .trim();

    const mensajeConfirmacion =
      nuevoRol === 'admin'
        ? `¿Convertir a ${nombreCompleto} en administrador? Tendrá acceso al panel administrativo.`
        : `¿Cambiar a ${nombreCompleto} al rol de usuario? Perderá el acceso administrativo.`;

    if (
      !window.confirm(
        mensajeConfirmacion,
      )
    ) {
      return;
    }

    this.procesandoRolId.set(
      usuario.id_usuario,
    );

    this.adminService
      .cambiarRolUsuario(
        usuario.id_usuario,
        nuevoRol,
      )
      .subscribe({
        next: (respuesta) => {
          this.procesandoRolId.set(
            null,
          );

          this.mensaje.set(
            respuesta.mensaje,
          );

          this.cargar();
        },

        error: (error) => {
          this.procesandoRolId.set(
            null,
          );

          this.error.set(
            this.adminService.mensajeError(
              error,
              'No se pudo cambiar el rol',
            ),
          );
        },
      });
  }

  protected eliminar(
    usuario: UsuarioAdmin,
  ): void {
    this.error.set('');
    this.mensaje.set('');

    if (usuario.es_admin_actual) {
      this.error.set(
        'No puedes desactivar tu propia cuenta administrativa',
      );

      return;
    }

    const advertencia =
      usuario.rol === 'admin'
        ? ' También perderá el acceso administrativo.'
        : '';

    if (
      !window.confirm(
        `¿Desactivar a ${usuario.nombre} ${usuario.apellido}?${advertencia}`,
      )
    ) {
      return;
    }

    this.adminService
      .eliminarUsuario(
        usuario.id_usuario,
      )
      .subscribe({
        next: (respuesta) => {
          this.mensaje.set(
            respuesta.mensaje,
          );

          this.cargar();
        },

        error: (error) => {
          this.error.set(
            this.adminService.mensajeError(
              error,
              'No se pudo desactivar el usuario',
            ),
          );
        },
      });
  }

  protected cancelar(): void {
    this.mostrarFormulario =
      false;

    this.editandoId = null;
  }

  private vacio(): FormUsuario {
    return {
      nombre: '',
      apellido: '',
      correo: '',
      telefono: '',
      password: '',
      activo: true,
    };
  }
}