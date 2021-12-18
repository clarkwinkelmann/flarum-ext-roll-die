import app from 'flarum/admin/app';

app.initializers.add('roll-die', () => {
    app.extensionData
        .for('clarkwinkelmann-roll-die')
        .registerSetting({
            setting: 'roll-die.clearOnEdit',
            type: 'boolean',
            label: app.translator.trans('clarkwinkelmann-roll-die.admin.settings.clearOnEdit'),
        });
});
