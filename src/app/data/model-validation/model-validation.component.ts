import { Component, OnInit } from '@angular/core';
import {SapphireDb, DefaultCollection} from 'ng-sapphiredb';
import {Observable} from 'rxjs';
import {FormControl, FormGroup} from '@angular/forms';
import {CommandResult} from '../../../../projects/ng-sapphiredb/src/lib/models/command-result';
import {take} from 'rxjs/operators';
import {M4FormGroup} from 'ng-metro4';

@Component({
  selector: 'app-model-validation',
  templateUrl: './model-validation.component.html',
  styleUrls: ['./model-validation.component.less']
})
export class ModelValidationComponent implements OnInit {

  collection: DefaultCollection<any>;
  values$: Observable<any[]>;

  form: FormGroup;

  constructor(private db: SapphireDb) { }

  ngOnInit() {
    this.collection = this.db.collection('demo.validationDemos');
    this.values$ = this.collection.values();

    this.form = new M4FormGroup('demo_form', {
      id: new FormControl(null),
      username: new FormControl(''),
      email: new FormControl(''),
      password: new FormControl('')
    });
  }

  resetForm() {
    this.form.patchValue({
      id: null,
      username: '',
      email: '',
      password: ''
    });
  }

  setFormValue(value: any) {
    this.form.patchValue(value);
  }

  remove(value: any) {
    this.collection.remove(value);
  }

  store() {
    const rawFormValue = this.form.getRawValue();

    let result$: Observable<CommandResult<any>>;

    if (!!rawFormValue.id) {
      result$ = this.collection.update(rawFormValue);
    } else {
      delete rawFormValue.id;
      result$ = this.collection.add(rawFormValue);
    }

    result$.pipe(take(1)).subscribe((result: CommandResult<any>) => {
      if (result.hasSuccess()) {
        this.resetForm();
      } else {
        Object.keys(result.validationResults).forEach(key => {
          const errors = {};
          result.validationResults[key].forEach(error => errors[error] = true);
          this.form.get(key).setErrors(errors);
        });
      }
    });
  }
}
