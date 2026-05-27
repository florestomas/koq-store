import { TestBed } from '@angular/core/testing';
import { HistorialComponent } from './historial.component';

describe('HistorialComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistorialComponent],
    }).compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(HistorialComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should render the title', () => {
    const fixture = TestBed.createComponent(HistorialComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('HISTORIAL DE VENTAS');
  });
});
