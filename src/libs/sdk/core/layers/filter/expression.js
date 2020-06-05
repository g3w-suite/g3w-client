import {EXPRESSION_OPERATORS as OPERATORS} from './operators';
//Expression
function Expression(options={}) {
  this._layerName = options.layerName;
  const filter = options.filter;
  this._expression = filter &&  filter ||  '';
}

const proto = Expression.prototype;

proto.and = function(field, value) {
    this._expression = this._expression ? this._expression + ' AND ': this._expression;
    if (field && value) {
      this.eq(field, value);
    }
    return this;
};

proto.or = function() {
  if (field && value) {
    this._expression = this._expression ? this._expression + ' OR ' : this._expression;
    this.eq(field, value);
  }
  return this;
};

proto.eq = function (field, value) {
  this._expression = this._expression + this._build('eq', field, value);
  return this;
};

proto.like = function(field, value) {
  this._expression = this._expression + this._build('LIKE', field, value);
  return this;
};

proto.ilike = function(field, value) {
  this._expression = this._expression + this._build('ILIKE', field, value);
  return this;
};

proto.not = function(field, value) {
  this._expression = this._expression + this._build('NOT', field, value);
  return this;
};

proto.gt = function(field, value) {
  this._expression = this._expression + this._build('gt', field, value);
  return this;
};

proto.gte = function(field, value) {
  this._expression = this._expression + this._build('gte', field, value);
  return this;
};

proto.lt = function(field, value) {
  this._expression = this._expression + this._build('lt', field, value);
  return this;
};

proto.lte = function(field, value) {
  this._expression = this._expression + this._build('lte', field, value);
  return this;
};

proto.clear = function() {
  this._expression = '';
  return this;
};

// get expression method to get the realt value of the expression
proto.get = function() {
  return this._layerName ? `${this._layerName}: ${this._expression}`: this._expression;
};

proto._build = function(operator, field, value) {
  return [`"${field}"`, OPERATORS[operator], `${value}`].join(' ');
};

proto.createExpressionFromFilter = function(filterObject, layername) {
  function createSingleFilter(booleanObject) {
    let filterElements = [];
    let rootFilter;
    for (const operator in booleanObject) {
      rootFilter = OPERATORS[operator];
      const inputs = booleanObject[operator];
      inputs.forEach((input) => {
        for (const operator in input) {
          const value = input[operator];
          if (Array.isArray(value)) {
            filterElement = createSingleFilter(input);
          } else {
            const valueExtra = (operator === 'LIKE' || operator === 'ILIKE')  ? "%": "";
            filterOp = OPERATORS[operator];
            for (const operator in input) {
              const field = input[operator];
              for (const name in field) {
                const value = field[name];
                if (operator === 'IN') {
                  const _value = Array.isArray(value) ? value : [value];
                  const filterValue = `( ${_value.join(',').replace(/,/g, ' , ')} )`;
                  const  filterElement = `"${name}" ${filterOp} ${filterValue}`;
                  filterElements.push(filterElement)
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
                      const filterElement = `"${name}" ${filterOp} '${filterValue}'`;
                      _filterElements.push(filterElement)
                    }
                    filterElements.push(_filterElements.join(' AND '))
                  } else {
                    const filterValue = `${valueExtra}${value}${valueExtra}`;
                    const filterElement = `"${name}" ${filterOp} '${filterValue}'`;
                    filterElements.push(filterElement);
                  }
                }
              }
            }
          }
        }
      });
      rootFilter = (filterElements.length > 0) ? filterElements.join(" "+ rootFilter + " ") : false;
    }
    return rootFilter;
  }
  const filter = createSingleFilter(filterObject);
  if (filter)
    this._expression = `${layername}:${filter}`;
  return this
};


module.exports = Expression;
