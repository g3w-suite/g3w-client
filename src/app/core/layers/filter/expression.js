import {EXPRESSION_OPERATORS as OPERATORS} from './operators';
//Expression
class Expression {
  constructor(options={}) {
    this._layerName = options.layerName;
    const filter = options.filter;
    this._expression = filter &&  filter ||  '';
  }

  and(field, value) {
    this._expression = this._expression ? this._expression + ' AND ': this._expression;
    if (field && value) {
      this.eq(field, value);
    }
    return this;
  };

  or() {
    if (field && value) {
      this._expression = this._expression ? this._expression + ' OR ' : this._expression;
      this.eq(field, value);
    }
    return this;
  };

  eq(field, value) {
    this._expression = this._expression + this._build('eq', field, value);
    return this;
  };

  like(field, value) {
    this._expression = this._expression + this._build('LIKE', field, value);
    return this;
  };

  ilike(field, value) {
    this._expression = this._expression + this._build('ILIKE', field, value);
    return this;
  };

  not(field, value) {
    this._expression = this._expression + this._build('NOT', field, value);
    return this;
  };

  gt(field, value) {
    this._expression = this._expression + this._build('gt', field, value);
    return this;
  };

  gte(field, value) {
    this._expression = this._expression + this._build('gte', field, value);
    return this;
  };

  lt(field, value) {
    this._expression = this._expression + this._build('lt', field, value);
    return this;
  };

  lte(field, value) {
    this._expression = this._expression + this._build('lte', field, value);
    return this;
  };

  clear() {
    this._expression = '';
    return this;
  };

  // get expression method to get the realt value of the expression
  get() {
    return this._layerName ? `${this._layerName}: ${this._expression}`: this._expression;
  };

  _build(operator, field, value) {
    return [`"${field}"`, OPERATORS[operator], `${value}`].join(' ');
  };

  createSingleExpressionElement({value, attribute, operator, logicop}={}) {
    let filterElement;
    const valueExtra = (operator === 'LIKE' || operator === 'ILIKE')  ? "%": "";
    const filterOp = OPERATORS[operator];
    const filterLogicOperator = logicop && ` ${logicop} ` || '';
    if (operator === 'IN') {
      const _value = Array.isArray(value) ? value : [value];
      const filterValue = `( ${_value.map(value => `'${value}'`).join(',').replace(/,/g, ' , ')} )`;
      filterElement = `"${attribute}" ${filterOp} ${filterValue}${filterLogicOperator}`;
    } else if ((value !== null && value !== undefined) && !(Number.isNaN(value) || !value.toString().trim())) {
      const singolequote = typeof value !== 'number' ? value.split("'") : [];
      if (singolequote.length > 1) {
        const _filterElements = [];
        for (let i = 0; i < singolequote.length; i++) {
          const value = singolequote[i];
          if (!value)
            continue;
          const filterOp = 'ILIKE';
          const filterValue = `%${value}%`.trim();
          const filterElement = `"${attribute}" ${filterOp} '${filterValue}'`;
          _filterElements.push(filterElement)
        }
        filterElement =  `${_filterElements.join(' AND ')}${filterLogicOperator}`;
      } else filterElement = `"${attribute}" ${filterOp} '${valueExtra}${value}${valueExtra}'${filterLogicOperator}`;
  }
  return filterElement;
  };

  createExpressionFromFilterObject(filter={}) {
    let filterElements = [];
    let rootFilter;
    for (const operator in filter) {
      rootFilter = OPERATORS[operator];
      const inputs = filter[operator];
      inputs.forEach((input) => {
        for (const operator in input) {
          const value = input[operator];
          if (Array.isArray(value)) {
            this.createExpressionFromFilterObject(input);
          } else {
            const field = input[operator];
            for (const attribute in field) {
              const value = field[attribute];
              const fieldElement = this.createSingleExpressionElement({
                value,
                operator,
                attribute
              });
              filterElements.push(fieldElement);
            }
          }
        }
      });
      rootFilter = (filterElements.length > 0) ? filterElements.join(" "+ rootFilter + " ") : false;
    }
    return rootFilter;
  };

  createExpressionFromField({layerName, field, value, operator='eq'}) {
    const filter = this.createSingleExpressionElement({
      attribute: field,
      value,
      operator
    });
    this._expression = `${layerName}:${filter}`;
    return this;
  };

  createExpressionFromFilterArray(inputs=[]) {
    let filter = '';
    // set logicop of last element to null
    const inputsLength = inputs.length ? inputs.length - 1 : inputs.length;
    inputs.forEach((input, index) => {
      const filterElement = this.createSingleExpressionElement(input);
      filter = `${filter}${(input.logicop && index === inputsLength) ? filterElement.substring(0, filterElement.length - (input.logicop.length+1)): filterElement}`;
    });
    return filter || undefined;
  };

  createExpressionFromFilter(filter, layerName) {
    const filterParam = Array.isArray(filter)  ? this.createExpressionFromFilterArray(filter) : this.createExpressionFromFilterObject(filter);
    if (filterParam) this._expression = `${layerName}:${filterParam}`;
    return this
  };
}


export default  Expression;
