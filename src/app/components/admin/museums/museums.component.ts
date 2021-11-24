import { Component, OnInit } from '@angular/core';
import { Museum } from 'src/app/models/Museum';
import { MuseumHttpService } from 'src/app/services/http/museum-http.service';
import { BaseComponent } from '../../base/base.component';
import { takeUntil } from 'rxjs/operators';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Exhibition } from 'src/app/models/Exhibition';

@Component({
  selector: 'app-museums',
  templateUrl: './museums.component.html',
  styleUrls: ['./museums.component.scss'],
})
export class MuseumsComponent extends BaseComponent {
  museums: Museum[] = [];

  cityList?: string[];
  nameList?: string[];

  city: FormControl = new FormControl('city');
  name: FormControl = new FormControl('name');

  selectedCity = '';
  selectedName = '';

  formVisible = false;
  readonly = false;

  museumForm!: FormGroup;


  constructor(
    private museumHttpService: MuseumHttpService,
    private fb: FormBuilder
  ) {
    super();
  }

  ngOnInit(): void {
    this.getAllMuseums();
    this.updateMuseumList();
    this.createForm();
  }

  ngOnDestroy() {
    super.ngOnDestroy();
  }

  updateMuseumList(): void {
    this.city.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (activeCity:string) => {
          this.selectedCity = activeCity;
          this.selectedName = '';
          this.getAllMuseums();
        },
        err => alert(err.message),
        () => console.log('unsubsribed from museum city valueChanges')
      )
    this.name.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (activeName:string) => {
          this.selectedName = activeName;
          this.getAllMuseums();
        },
        err => alert(err.message),
        () => console.log('unsubsribed from museum name valueChanges')
      )
  }

  clearFilters() {
    this.selectedCity = '';
    this.selectedName = '';
    this.city.setValue(this.selectedCity);
    this.name.setValue(this.selectedName);
  }

  getAllMuseums(city = this.selectedCity, name = this.selectedName): void {
    const query = { city, name };
    this.museumHttpService
      .getAll(query)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (museumList: Museum[]) => {
          this.museums = museumList;

          if (!this.cityList || !this.cityList.length) {
            const cities = this.museums.map((m) => m.city);
            this.cityList = [...new Set(cities)].sort();
          }

          const names = this.museums
            .map((m) => m.name)
            .sort();
          this.nameList = names;
        },
        (err) => alert(err.message)
      );
  }

  createForm(): void {
    this.museumForm = this.fb.group({
      id: [''],
      name: ['', Validators.required],
      city: ['', Validators.required],
      zip: ['', Validators.required],
      address: ['', Validators.required],
      openingHours: ['', Validators.required],
      description: ['', Validators.required],
    });
  }



  setFormVisibility(): void {
    this.formVisible = !this.formVisible;
    if (this.readonly) {
      this.readonly = false;
    }
    this.museumForm.reset();
  }

  onSubmit(): void {
    // we check if we should update or create a museum.
    if (this.museumForm.value.id) {
      const { id }: { id: string } = this.museumForm.value;
      const payload = this.museumForm.value;

      this.museumHttpService
        .updateById(payload, id)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (savedMuseum: Museum) => {
            if (savedMuseum) {
              this.museums = this.museums.map((m) =>
                m.id === Number(id) ? savedMuseum : m
              );
            } else {
              throw new Error('something went wrong');
            }
          },
          (error: any) => alert(error.message),
          () => {
            this.museumForm.reset();
            this.readonly = false;
            this.setFormVisibility();
          }
        );
    } else {
      // we create a new museum entry
      const { name, city, zip, address, openingHours, description } =
        this.museumForm.value;
      const newMuseum: Museum = {
        name,
        city,
        zip,
        address,
        openingHours,
        description,
        exhibitions: [],
      };
      this.museumHttpService
        .create(newMuseum)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (savedMuseum: Museum) => {
            if (savedMuseum) {
              this.museums = [...this.museums, savedMuseum];
            } else {
              throw new Error('something went wrong');
            }
          },
          (error: any) => alert(error.message),
          () => {
            this.museumForm.reset();
            this.readonly = false;
            this.setFormVisibility();
          }
        );
    }
  }

  editMuseum(museum: Museum): void {
    if (!this.formVisible) {
      this.setFormVisibility();
    }
    this.museumForm.patchValue(museum);
    this.readonly = true;
  }

  deleteMuseum(id: number | undefined, name: string): void {
    const confirmed = confirm(
      `You are about to delete: ${name}. Are you sure?`
    );
    if (confirmed && id) {
      this.museumHttpService
        .deleteById(id.toString())
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          () => console.log(`Museum: ${name} has been deleted`),
          (err) => alert(err.message),
          () => {
            this.museums = this.museums.filter((m) => m.id !== Number(id));
          }
        );
    } else {
      return;
    }
  }
}
