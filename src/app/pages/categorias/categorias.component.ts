import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { CatalogService } from '../../core/services/catalog.service';
import { getSupabase } from '../../core/services/supabase.service';

@Component({
  selector: 'app-categorias',
  imports: [MatDialogModule, MatIcon, UpperCasePipe],
  templateUrl: './categorias.component.html',
  styleUrl: './categorias.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriasComponent {
  private readonly dialogRef = inject(MatDialogRef<CategoriasComponent>);
  private readonly catalogService = inject(CatalogService);

  readonly categories = this.catalogService.categories;

  readonly newName = signal('');
  readonly isSaving = signal(false);
  readonly error = signal<string | null>(null);

  readonly editingId = signal<string | null>(null);
  readonly editingName = signal('');
  readonly isRenaming = signal(false);

  close(): void {
    this.dialogRef.close();
  }

  async add(): Promise<void> {
    const name = this.newName().trim().toUpperCase();
    if (!name) return;
    if (this.isSaving()) return;

    if (this.categories().some((c) => c.name === name)) {
      this.error.set('Ya existe una categoría con ese nombre');
      return;
    }

    this.isSaving.set(true);
    this.error.set(null);
    try {
      const supabase = getSupabase();
      const { error: err } = await supabase.from('categories').insert({
        id: crypto.randomUUID(),
        name,
      });
      if (err) {
        this.error.set('Error al crear la categoría');
        return;
      }
      await this.catalogService.triggerRefresh();
      this.newName.set('');
    } finally {
      this.isSaving.set(false);
    }
  }

  startEdit(catId: string, currentName: string): void {
    this.editingId.set(catId);
    this.editingName.set(currentName);
    this.error.set(null);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editingName.set('');
    this.error.set(null);
  }

  async saveRename(): Promise<void> {
    const catId = this.editingId();
    if (!catId) return;

    const name = this.editingName().trim().toUpperCase();
    if (!name) return;
    if (this.isRenaming()) return;

    if (this.categories().some((c) => c.id !== catId && c.name === name)) {
      this.error.set('Ya existe otra categoría con ese nombre');
      return;
    }

    this.isRenaming.set(true);
    this.error.set(null);
    try {
      const supabase = getSupabase();
      const { error: err } = await supabase
        .from('categories')
        .update({ name })
        .eq('id', catId);
      if (err) {
        this.error.set('Error al actualizar la categoría');
        return;
      }
      await this.catalogService.triggerRefresh();
      this.editingId.set(null);
      this.editingName.set('');
    } finally {
      this.isRenaming.set(false);
    }
  }

  async remove(catId: string): Promise<void> {
    const supabase = getSupabase();
    const { count } = await supabase
      .from('clothing_models')
      .select('*', { count: 'exact', head: true })
      .eq('id_category', catId);

    if (count && count > 0) {
      this.error.set('No se puede eliminar: hay modelos que usan esta categoría');
      return;
    }

    if (!window.confirm('¿Eliminar esta categoría definitivamente?')) return;

    this.error.set(null);
    const { error: err } = await supabase.from('categories').delete().eq('id', catId);
    if (err) {
      this.error.set('Error al eliminar la categoría');
      return;
    }
    await this.catalogService.triggerRefresh();
  }
}
