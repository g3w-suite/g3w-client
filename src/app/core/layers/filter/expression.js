import { FILTER_EXPRESSION_OPERATORS } from 'app/constant';

//Expression
module.exports = class Expression {
  
  constructor(options={}) {
    this._layerName  = options.layerName;
    this._expression = options.filter || '';
  }

  and(field, value) {
    this._expression = this._expression ? this._expression + ' AND ': this._expression;
    if (field && value) {
      this.eq(field, value);
    }
    return this;
  }

  or(field, value) {
    if (field && value) {
      this._expression = this._expression ? this._expression + ' OR ' : this._expression;
      this.eq(field, value);
    }
    return this;
  }

  eq(field, value) {
    this._expression = this._expression + this._build('eq', field, value);
    return this;
  }

  like(field, value) {
    this._expression = this._expression + this._build('LIKE', field, value);
    return this;
  };

  ilike(field, value) {
    this._expression = this._expression + this._build('ILIKE', field, value);
    return this;
  }

  not(field, value) {
    this._expression = this._expression + this._build('NOT', field, value);
    return this;
  }

  gt(field, value) {
    this._expression = this._expression + this._build('gt', field, value);
    return this;
  }

  gte(field, value) {
    this._expression = this._expression + this._build('gte', field, value);
    return this;
  }

  lt(field, value) {
    this._expression = this._expression + this._build('lt', field, value);
    return this;
  }

  lte(field, value) {
    this._expression = this._expression + this._build('lte', field, value);
    return this;
  }

  clear() {
    this._expression = '';
    return this;
  }

  // get expression method to get the realt value of the expression
  get() {
    return this._layerName ? `${this._layerName}: ${this._expression}`: this._expression;
  }

  _build(operator, field, value) {
    return [`"${field}"`, FILTER_EXPRESSION_OPERATORS[operator], `${value}`].join(' ');
  }

  createSingleExpressionElement({ value, attribute, operator, logicop } = {}) {
    const op    = FILTER_EXPRESSION_OPERATORS[operator];
    const logic = logicop && ` ${logicop} ` || '';
    
    if ('IN' === operator) {
      return `"${attribute}" ${op} ( ${ [].concat(value).map(v => `'${v}'`).join(',').replace(/,/g, ' , ') } )${logic}`;
    }

    const is_num = ![null, undefined].includes(value) && !(Number.isNaN(value) || !value.toString().trim()) //check if a valid number (not a NaN and not an empty string)
    const vals   = (Array.isArray(value) ? value : ('number' !== typeof value ? value.split("'") : []));

    if (is_num && vals.length > 1) {
      return `${vals.filter(v => v).map(v => `"${attribute}" ${op} '%${v}%'`).join(` ${logicop} `)}${logic}`;
    }

    if (is_num) {
      const like = ['LIKE', 'ILIKE'].includes(operator) ? "%": ""
      return `"${attribute}" ${op} '${like}${value}${like}'${logic}`;
    }
  }

  createExpressionFromFilterObject(filter={}) {
    let filters = [];
    let rootFilter;
    for (const operator in filter) {
      rootFilter = FILTER_EXPRESSION_OPERATORS[operator];
      filter[operator].forEach((input) => {
        for (const operator in input) {
          if (Array.isArray(input[operator])) {
            this.createExpressionFromFilterObject(input);
          } else {
            for (const attribute in input[operator]) {
              filters.push(this.createSingleExpressionElement({ value: input[operator][attribute], operator, attribute }));
            }
          }
        }
      });
      rootFilter = filters.join(' ' + rootFilter + ' ') || false;
    }
    return rootFilter;
  }

  createExpressionFromField({layerName, field, value, operator='eq'}) {
    this._expression = `${layerName}:${this.createSingleExpressionElement({ attribute: field, value, operator })}`;
    return this;
  }

  createExpressionFromFilterArray(inputs=[]) {
    return inputs.reduce((acc, input, i) => {
      const filter = this.createSingleExpressionElement(input);
    // set logicop of last element to null
      return `${acc}${(input.logicop && i === inputs.length - 1) ? filter.substring(0, filter.length - (input.logicop.length + 1)) : filter}`;
    }, '') || undefined;
  }

  createExpressionFromFilter(filter, layerName) {
    const fparam = Array.isArray(filter) ? this.createExpressionFromFilterArray(filter) : this.createExpressionFromFilterObject(filter);
    if (fparam) this._expression = `${layerName}:${fparam}`;
    return this
  }
};