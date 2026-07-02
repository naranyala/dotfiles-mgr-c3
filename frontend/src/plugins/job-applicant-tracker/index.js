import { JobApplicantTrackerComponent } from '../../components/job-applicant-tracker.js'

export const state = {}

export async function init() {
    if (!customElements.get('job-applicant-tracker')) {
        customElements.define('job-applicant-tracker', JobApplicantTrackerComponent)
    }
}

export function render() {
    return `<job-applicant-tracker></job-applicant-tracker>`
}
