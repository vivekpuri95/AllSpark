Page.class = class extends Page {
    constructor() {
        super();

        this.form = this.container.querySelector('form');
        this.message = this.container.querySelector('#message');
        this.form.on('submit', async (e) => {
            e.preventDefault();

            const options = {
                method: 'POST',
                form: new FormData(this.form),
            };

            try {
                const response = await API.call('users/changePassword', {}, options);
                this.message.textContent = 'Password Changed!';
            }
            catch (e) {
                this.message.textContent = e.message;
            }

            this.message.classList.remove('hidden');
        });

        Sections.show('form');
    }
}