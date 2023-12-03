import { CheckboxList } from '@/components/organisms/UIRenderer/elements/JSONForm/components/CheckboxList';
import { CountryPicker } from '@/components/organisms/UIRenderer/elements/JSONForm/components/CountryPicker';
import { DocumentField } from '@/components/organisms/UIRenderer/elements/JSONForm/components/DocumentField';
import { IndustriesPicker } from '@/components/organisms/UIRenderer/elements/JSONForm/components/IndustriesPicker';
import { JSONFormArrayFieldLayout } from '@/components/organisms/UIRenderer/elements/JSONForm/components/JSONFormArrayFieldLayout';
import { LocalePicker } from '@/components/organisms/UIRenderer/elements/JSONForm/components/LocalePicker';
import { Multiselect } from '@/components/organisms/UIRenderer/elements/JSONForm/components/Multiselect/Multiselect';
import { NationalityPicker } from '@/components/organisms/UIRenderer/elements/JSONForm/components/NationalityPicker';
import { StatePicker } from '@/components/organisms/UIRenderer/elements/JSONForm/components/StatePicker';
import { withDynamicUIInput } from '@/components/organisms/UIRenderer/elements/JSONForm/hocs/withDynamicUIInput';
import {
  AutocompleteTextInputAdapter,
  baseLayouts,
  BooleanFieldAdapter,
  DateInputAdater,
  FileInputAdapter,
  PhoneInputAdapter,
  TextInputAdapter,
} from '@ballerine/ui';

export const jsonFormFields = {
  // Component with suffix Field is an overriding of internal RSJV components
  StringField: withDynamicUIInput(TextInputAdapter),
  BooleanField: withDynamicUIInput(BooleanFieldAdapter),

  // Component with suffix Input is an extend of supported field types
  FileInput: withDynamicUIInput(FileInputAdapter),
  DateInput: withDynamicUIInput(DateInputAdater),
  PhoneInput: withDynamicUIInput(PhoneInputAdapter),
  AutocompleteInput: withDynamicUIInput(AutocompleteTextInputAdapter),
  DocumentInput: withDynamicUIInput(DocumentField),
  NationalityPicker: withDynamicUIInput(NationalityPicker),
  LocalePicker: withDynamicUIInput(LocalePicker),
  CountryPicker: withDynamicUIInput(CountryPicker),
  CheckboxList: withDynamicUIInput(CheckboxList),
  IndustriesPicker: withDynamicUIInput(IndustriesPicker),
  Multiselect: withDynamicUIInput(Multiselect),
  StatePicker: withDynamicUIInput(StatePicker),
};

export const jsonFormLayouts = {
  ...baseLayouts,
  ArrayFieldTemplate: JSONFormArrayFieldLayout,
};