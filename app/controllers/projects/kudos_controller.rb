class Projects::KudosController < ApplicationController
  KUDOS_REVIEW_CHANNEL_ID = ENV["KUDOS_REVIEW_CHANNEL_ID"]

  skip_after_action :verify_authorized # Controller has no index action; create still calls authorize explicitly.
  skip_after_action :verify_policy_scoped # Controller has no index action or policy-scoped collection.

  def create
    project = Project.public_for_explore.find(params[:project_id])
    kudo = project.project_kudos.build(kudo_params.merge(sender: current_user, recipient: project.user))
    authorize kudo

    if kudo.save
      SlackMsgJob.perform_later(KUDOS_REVIEW_CHANNEL_ID, slack_message(kudo), blocks: slack_blocks(kudo))
      redirect_back fallback_location: bulletin_board_path, notice: "Kudos sent for review."
    else
      redirect_back fallback_location: bulletin_board_path, alert: kudo.errors.full_messages.to_sentence
    end
  end

  private

  def kudo_params
    params.require(:project_kudo).permit(:text)
  end

  def slack_message(kudo)
    "Kudos for #{kudo.project.name} from #{kudo.sender.display_name}: #{kudo.text}"
  end

  def slack_blocks(kudo)
    [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*new kudos text!*\n*On project:* <#{project_url(kudo.project)}|#{slack_escape(kudo.project.name)}>\n*Sender Username:* #{slack_escape(kudo.sender.display_name)}\n *Sender Slack ID*: <@#{kudo.sender.slack_id || "no slackc id for some reason "}>\n*To:* #{slack_escape(kudo.recipient.display_name)}\n*Text::*\n#{slack_escape(kudo.text)}"
        }
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Approve!" },
            style: "primary",
            action_id: "approve_project_kudo",
            value: kudo.id.to_s
          }
        ]
      }
    ]
  end

  def slack_escape(value)
    ERB::Util.html_escape(value.to_s)
  end
end
