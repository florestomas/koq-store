import { TestBed } from '@angular/core/testing';
import { RecepcionesComponent } from './recepciones.component';

describe('RecepcionesComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecepcionesComponent],
    }).compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(RecepcionesComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should render the title', () => {
    const fixture = TestBed.createComponent(RecepcionesComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('RECEPCIONES');
  });
});
