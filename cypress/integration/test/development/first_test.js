describe('My First Test', () => {
  before(()=>{
    cy.visit('/en/login/?next=/?project=3003/qdjango/27');
    cy.get('input[name="username"]').type(Cypress.env('username') );
    cy.get('input[name="password"]').type(Cypress.env('password') );
    cy.get('button').click();
  });
  it('Does not do much! True', () => {
    expect(true).to.equal(true)
  });
  it('Does not do much! False', () => {
    expect(false).to.equal(false)
  })
});